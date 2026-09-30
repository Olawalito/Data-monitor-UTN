const test = require('node:test');
const assert = require('node:assert/strict');

const { createRefreshService } = require('../src/refresh-service');

function record(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    label: 'Router',
    msisdn: '+2348012345678',
    balance: null,
    balanceUnit: null,
    expiresAt: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    status: 'pending',
    errorCode: null,
    ...overrides,
  };
}

function memoryStore(records) {
  let sims = structuredClone(records);
  return {
    async list() { return structuredClone(sims); },
    async update(id, patch) {
      const index = sims.findIndex((sim) => sim.id === id);
      if (index === -1) {
        const error = new Error('not found');
        error.code = 'SIM_NOT_FOUND';
        throw error;
      }
      sims[index] = { ...sims[index], ...patch };
      return structuredClone(sims[index]);
    },
  };
}

test('persists successful normalized balance data and timestamps', async () => {
  const store = memoryStore([record()]);
  const service = createRefreshService({
    store,
    mtnClient: { getDataPlan: async () => ({ balance: 2.25, balanceUnit: 'GB', expiresAt: '2026-10-31T00:00:00.000Z' }) },
    clock: () => Date.parse('2026-09-29T14:30:00.000Z'),
    intervalMs: 900_000,
  });

  const result = await service.refreshOne(record().id);

  assert.equal(result.status, 'fresh');
  assert.equal(result.balance, 2.25);
  assert.equal(result.lastAttemptAt, '2026-09-29T14:30:00.000Z');
  assert.equal(result.lastSuccessAt, '2026-09-29T14:30:00.000Z');
  assert.equal(result.errorCode, null);
});

test('refreshes all SIMs sequentially', async () => {
  const second = record({ id: '22222222-2222-4222-8222-222222222222', msisdn: '+2348123456789' });
  const store = memoryStore([record(), second]);
  let active = 0;
  let maxActive = 0;
  const service = createRefreshService({
    store,
    mtnClient: {
      async getDataPlan() {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setImmediate(resolve));
        active -= 1;
        return { balance: 100, balanceUnit: 'MB', expiresAt: null };
      },
    },
    intervalMs: 900_000,
  });

  const results = await service.refreshAll();

  assert.equal(results.length, 2);
  assert.equal(maxActive, 1);
});

test('coalesces overlapping refreshes for the same SIM', async () => {
  const store = memoryStore([record()]);
  let calls = 0;
  let resolvePlan;
  const plan = new Promise((resolve) => { resolvePlan = resolve; });
  const service = createRefreshService({
    store,
    mtnClient: {
      async getDataPlan() {
        calls += 1;
        return plan;
      },
    },
    intervalMs: 900_000,
  });

  const first = service.refreshOne(record().id);
  const second = service.refreshOne(record().id);
  resolvePlan({ balance: 100, balanceUnit: 'MB', expiresAt: null });

  assert.equal(await first, await second);
  assert.equal(calls, 1);
});

test('preserves cached data and marks it stale after an MTN failure', async () => {
  const cached = record({
    balance: 512,
    balanceUnit: 'MB',
    expiresAt: '2026-10-01T00:00:00.000Z',
    lastSuccessAt: '2026-09-29T12:00:00.000Z',
    status: 'fresh',
  });
  const store = memoryStore([cached]);
  const error = new Error('sensitive upstream body');
  error.code = 'MTN_TIMEOUT';
  const service = createRefreshService({
    store,
    mtnClient: { getDataPlan: async () => { throw error; } },
    clock: () => Date.parse('2026-09-29T15:00:00.000Z'),
    intervalMs: 900_000,
  });

  const result = await service.refreshOne(cached.id);

  assert.equal(result.status, 'stale');
  assert.equal(result.balance, 512);
  assert.equal(result.lastSuccessAt, '2026-09-29T12:00:00.000Z');
  assert.equal(result.errorCode, 'MTN_TIMEOUT');
  assert.doesNotMatch(JSON.stringify(result), /sensitive upstream body/);
});

test('marks a never-refreshed SIM as error and sanitizes unknown failures', async () => {
  const store = memoryStore([record()]);
  const service = createRefreshService({
    store,
    mtnClient: { getDataPlan: async () => { throw new Error('database password leaked'); } },
    intervalMs: 900_000,
  });

  const result = await service.refreshOne(record().id);

  assert.equal(result.status, 'error');
  assert.equal(result.errorCode, 'MTN_UPSTREAM_FAILED');
  assert.equal(result.balance, null);
});

test('starts and stops one scheduler without running overlapping cycles', async () => {
  const store = memoryStore([record()]);
  let scheduled;
  let cleared;
  const service = createRefreshService({
    store,
    mtnClient: { getDataPlan: async () => ({ balance: 1, balanceUnit: 'MB', expiresAt: null }) },
    intervalMs: 1234,
    setIntervalImpl(callback, interval) {
      scheduled = { callback, interval, handle: Symbol('timer') };
      return scheduled.handle;
    },
    clearIntervalImpl(handle) { cleared = handle; },
  });

  service.start();
  service.start();
  assert.equal(scheduled.interval, 1234);
  await scheduled.callback();
  service.stop();
  assert.equal(cleared, scheduled.handle);
});
