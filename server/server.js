const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { loadConfig } = require('./src/config');
const { createAuthService } = require('./src/auth');
const { createSimStore } = require('./src/sim-store');
const { createMtnClient } = require('./src/mtn-client');
const { createRefreshService } = require('./src/refresh-service');
const { createApp } = require('./src/app');

async function start() {
  const config = loadConfig(process.env);
  const auth = createAuthService(config);
  const store = createSimStore({ filePath: path.join(__dirname, 'data', 'sims.json') });
  await store.init();
  const mtnClient = createMtnClient({
    consumerKey: config.mtnConsumerKey,
    consumerSecret: config.mtnConsumerSecret,
    tokenUrl: config.mtnTokenUrl,
    plansBaseUrl: config.mtnPlansBaseUrl,
  });
  const refreshService = createRefreshService({
    store,
    mtnClient,
    intervalMs: config.refreshIntervalMinutes * 60_000,
  });
  const app = createApp({
    config,
    auth,
    store,
    refreshService,
    staticDir: path.resolve(__dirname, '..', 'datrack', 'dist'),
  });
  const server = app.listen(config.port, config.host, () => {
    console.log(`Datrack is running at http://${config.host}:${config.port}`);
  });
  refreshService.start();

  function shutdown() {
    refreshService.stop();
    server.close(() => process.exit(0));
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(`Datrack failed to start: ${error.message}`);
  process.exitCode = 1;
});
