class MtnError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MtnError';
    this.code = code;
  }
}

function safeError(code) {
  const messages = {
    MTN_AUTH_FAILED: 'MTN authentication failed.',
    MTN_TIMEOUT: 'MTN did not respond in time.',
    MTN_NOT_FOUND: 'MTN could not find this subscriber.',
    MTN_BAD_RESPONSE: 'MTN returned an unexpected response.',
    MTN_UPSTREAM_FAILED: 'MTN is temporarily unavailable.',
  };
  return new MtnError(code, messages[code]);
}

function createMtnClient({
  fetchImpl = globalThis.fetch,
  consumerKey,
  consumerSecret,
  tokenUrl,
  plansBaseUrl,
  clock = Date.now,
  timeoutMs = 10_000,
}) {
  let tokenCache = null;
  let tokenPromise = null;

  async function request(url, options, errorCode) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') throw safeError('MTN_TIMEOUT');
      throw safeError(errorCode);
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchToken() {
    const url = new URL(tokenUrl);
    url.searchParams.set('grant_type', 'client_credentials');
    const body = new URLSearchParams({
      client_id: consumerKey,
      client_secret: consumerSecret,
    });
    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    }, 'MTN_AUTH_FAILED');

    if (!response.ok) throw safeError('MTN_AUTH_FAILED');
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw safeError('MTN_AUTH_FAILED');
    }
    const expiresIn = Number(payload.expires_in);
    if (typeof payload.access_token !== 'string' || !payload.access_token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw safeError('MTN_AUTH_FAILED');
    }
    tokenCache = {
      value: payload.access_token,
      usableUntil: clock() + Math.max(0, expiresIn * 1000 - 60_000),
    };
    return tokenCache.value;
  }

  async function getToken() {
    if (tokenCache && clock() < tokenCache.usableUntil) return tokenCache.value;
    if (!tokenPromise) {
      tokenPromise = fetchToken().finally(() => {
        tokenPromise = null;
      });
    }
    return tokenPromise;
  }

  function normalizePlans(payload) {
    const balances = payload?.data?.balance;
    if (!Array.isArray(balances)) throw safeError('MTN_BAD_RESPONSE');
    const dataBalance = balances.find((entry) => entry?.balanceDetail?.type === 'DATA');
    const value = Number(dataBalance?.balanceDetail?.activeValue);
    const unit = dataBalance?.balanceDetail?.activeUnit;
    if (!dataBalance || !Number.isFinite(value) || value < 0 || !['MB', 'GB'].includes(unit)) {
      throw safeError('MTN_BAD_RESPONSE');
    }

    let expiresAt = null;
    if (dataBalance.expiryDate !== null && dataBalance.expiryDate !== undefined) {
      const date = new Date(dataBalance.expiryDate);
      if (!Number.isFinite(date.getTime())) throw safeError('MTN_BAD_RESPONSE');
      expiresAt = date.toISOString();
    }
    return { balance: value, balanceUnit: unit, expiresAt };
  }

  async function getDataPlan(msisdn) {
    const token = await getToken();
    const base = plansBaseUrl.replace(/\/$/, '');
    const url = new URL(`${base}/${encodeURIComponent(msisdn)}/plans`);
    url.searchParams.set('plan', 'DATA');
    url.searchParams.set('idType', 'MSISDN');
    url.searchParams.set('segment', 'subscriber');

    const response = await request(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-API-Key': consumerKey,
        Accept: 'application/json',
      },
    }, 'MTN_UPSTREAM_FAILED');

    if (response.status === 401 || response.status === 403) {
      tokenCache = null;
      throw safeError('MTN_AUTH_FAILED');
    }
    if (response.status === 404) throw safeError('MTN_NOT_FOUND');
    if (!response.ok) throw safeError('MTN_UPSTREAM_FAILED');

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw safeError('MTN_BAD_RESPONSE');
    }
    return normalizePlans(payload);
  }

  return { getDataPlan };
}

module.exports = { createMtnClient, MtnError };
