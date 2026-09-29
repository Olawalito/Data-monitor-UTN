const test = require('node:test');
const assert = require('node:assert/strict');

const { createMtnClient } = require('../src/mtn-client');

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function plansPayload(overrides = {}) {
  return {
    statusCode: '0000',
    statusMessage: 'Successfully Processed',
    data: {
      type: 'Prepaid',
      status: 'Active',
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2027-01-01T00:00:00Z',
      language: 'En',
      tariffPlan: 'Data',
      balance: [{
        balanceType: 'DATA',
        expiryDate: '2026-10-31T23:59:59Z',
        balanceDetail: {
          type: 'DATA',
          activeValue: '2048',
          activeUnit: 'MB',
          unusedValue: '0',
          unusedUnit: 'MB',
        },
        wallets: [],
      }],
      ...overrides,
    },
  };
}

function clientFixture(fetchImpl, options = {}) {
  return createMtnClient({
    fetchImpl,
    consumerKey: 'key-value',
    consumerSecret: 'secret-value',
    tokenUrl: 'https://api.example.test/v1/oauth/access_token',
    plansBaseUrl: 'https://api.example.test/v2/customers',
    timeoutMs: 100,
    ...options,
  });
}

test('uses client credentials and sends the required Plans v2 request', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return jsonResponse(200, { access_token: 'token-one', expires_in: 3600 });
    return jsonResponse(200, plansPayload());
  };
  const client = clientFixture(fetchImpl);

  const result = await client.getDataPlan('+2348012345678');

  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].options.body)), {
    client_id: 'key-value',
    client_secret: 'secret-value',
  });
  assert.equal(new URL(calls[0].url).searchParams.get('grant_type'), 'client_credentials');
  const plansUrl = new URL(calls[1].url);
  assert.equal(plansUrl.pathname, '/v2/customers/%2B2348012345678/plans');
  assert.deepEqual(Object.fromEntries(plansUrl.searchParams), {
    plan: 'DATA',
    idType: 'MSISDN',
    segment: 'subscriber',
  });
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token-one');
  assert.equal(calls[1].options.headers['X-API-Key'], 'key-value');
  assert.deepEqual(result, {
    balance: 2048,
    balanceUnit: 'MB',
    expiresAt: '2026-10-31T23:59:59.000Z',
  });
});

test('reuses a valid token and coalesces concurrent token requests', async () => {
  let tokenCalls = 0;
  let planCalls = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('/oauth/')) {
      tokenCalls += 1;
      await new Promise((resolve) => setImmediate(resolve));
      return jsonResponse(200, { access_token: 'shared-token', expires_in: 3600 });
    }
    planCalls += 1;
    return jsonResponse(200, plansPayload());
  };
  const client = clientFixture(fetchImpl);

  await Promise.all([
    client.getDataPlan('+2348012345678'),
    client.getDataPlan('+2348123456789'),
  ]);
  await client.getDataPlan('+2348012345678');

  assert.equal(tokenCalls, 1);
  assert.equal(planCalls, 3);
});

test('renews the token shortly before expiry', async () => {
  let now = 1_000_000;
  let tokenCalls = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('/oauth/')) {
      tokenCalls += 1;
      return jsonResponse(200, { access_token: `token-${tokenCalls}`, expires_in: 120 });
    }
    return jsonResponse(200, plansPayload());
  };
  const client = clientFixture(fetchImpl, { clock: () => now });

  await client.getDataPlan('+2348012345678');
  now += 30_000;
  await client.getDataPlan('+2348012345678');
  now += 31_000;
  await client.getDataPlan('+2348012345678');

  assert.equal(tokenCalls, 2);
});

test('classifies authentication, not-found, and upstream failures safely', async () => {
  const authClient = clientFixture(async () => jsonResponse(401, { error: 'contains-secret-value' }));
  await assert.rejects(() => authClient.getDataPlan('+2348012345678'), (error) => {
    assert.equal(error.code, 'MTN_AUTH_FAILED');
    assert.doesNotMatch(error.message, /contains-secret-value/);
    return true;
  });

  for (const [status, code] of [[404, 'MTN_NOT_FOUND'], [500, 'MTN_UPSTREAM_FAILED']]) {
    let call = 0;
    const client = clientFixture(async () => {
      call += 1;
      return call === 1
        ? jsonResponse(200, { access_token: 'token', expires_in: 3600 })
        : jsonResponse(status, { error: 'private-upstream-body' });
    });
    await assert.rejects(() => client.getDataPlan('+2348012345678'), (error) => {
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private-upstream-body/);
      return true;
    });
  }
});

test('rejects malformed token and Plans responses', async () => {
  const missingToken = clientFixture(async () => jsonResponse(200, { expires_in: 3600 }));
  await assert.rejects(() => missingToken.getDataPlan('+2348012345678'), (error) => error.code === 'MTN_AUTH_FAILED');

  let call = 0;
  const malformedPlan = clientFixture(async () => {
    call += 1;
    return call === 1
      ? jsonResponse(200, { access_token: 'token', expires_in: 3600 })
      : jsonResponse(200, plansPayload({ balance: null }));
  });
  await assert.rejects(() => malformedPlan.getDataPlan('+2348012345678'), (error) => error.code === 'MTN_BAD_RESPONSE');
});

test('times out a stalled MTN request', async () => {
  const fetchImpl = (url, options) => {
    if (String(url).includes('/oauth/')) return Promise.resolve(jsonResponse(200, { access_token: 'token', expires_in: 3600 }));
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
  };
  const client = clientFixture(fetchImpl, { timeoutMs: 5 });

  await assert.rejects(() => client.getDataPlan('+2348012345678'), (error) => error.code === 'MTN_TIMEOUT');
});
