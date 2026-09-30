const SAFE_CODES = new Set([
  'MTN_AUTH_FAILED',
  'MTN_TIMEOUT',
  'MTN_NOT_FOUND',
  'MTN_BAD_RESPONSE',
  'MTN_UPSTREAM_FAILED',
]);

function createRefreshService({
  store,
  mtnClient,
  clock = Date.now,
  intervalMs,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
}) {
  const inFlight = new Map();
  let timer = null;
  let scheduledCycle = null;

  function refreshOne(id) {
    if (inFlight.has(id)) return inFlight.get(id);
    const operation = (async () => {
      const sim = (await store.list()).find((candidate) => candidate.id === id);
      if (!sim) {
        const error = new Error('SIM not found');
        error.code = 'SIM_NOT_FOUND';
        throw error;
      }

      const attemptedAt = new Date(clock()).toISOString();
      try {
        const plan = await mtnClient.getDataPlan(sim.msisdn);
        return await store.update(id, {
          balance: plan.balance,
          balanceUnit: plan.balanceUnit,
          expiresAt: plan.expiresAt,
          lastAttemptAt: attemptedAt,
          lastSuccessAt: attemptedAt,
          status: 'fresh',
          errorCode: null,
        });
      } catch (error) {
        const code = SAFE_CODES.has(error?.code) ? error.code : 'MTN_UPSTREAM_FAILED';
        return store.update(id, {
          lastAttemptAt: attemptedAt,
          status: sim.lastSuccessAt ? 'stale' : 'error',
          errorCode: code,
        });
      }
    })().finally(() => {
      inFlight.delete(id);
    });
    inFlight.set(id, operation);
    return operation;
  }

  async function refreshAll() {
    const sims = await store.list();
    const results = [];
    for (const sim of sims) {
      results.push(await refreshOne(sim.id));
    }
    return results;
  }

  function start() {
    if (timer) return;
    timer = setIntervalImpl(() => {
      if (scheduledCycle) return scheduledCycle;
      scheduledCycle = refreshAll()
        .catch(() => [])
        .finally(() => { scheduledCycle = null; });
      return scheduledCycle;
    }, intervalMs);
  }

  function stop() {
    if (!timer) return;
    clearIntervalImpl(timer);
    timer = null;
  }

  return { refreshOne, refreshAll, start, stop };
}

module.exports = { createRefreshService };
