#!/usr/bin/env node
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const { loadConfig } = require('../src/config');
const { normalizeNigerianMsisdn } = require('../src/msisdn');
const { createMtnClient } = require('../src/mtn-client');
const { redactMsisdn } = require('./setup');

async function main() {
  const msisdn = normalizeNigerianMsisdn(process.argv[2]);
  const config = loadConfig(process.env);
  const client = createMtnClient({
    consumerKey: config.mtnConsumerKey,
    consumerSecret: config.mtnConsumerSecret,
    tokenUrl: config.mtnTokenUrl,
    plansBaseUrl: config.mtnPlansBaseUrl,
  });
  const result = await client.getDataPlan(msisdn);
  process.stdout.write(`MTN check passed for ${redactMsisdn(msisdn)}: ${result.balance} ${result.balanceUnit}${result.expiresAt ? `, expires ${result.expiresAt}` : ''}\n`);
}

main().catch((error) => {
  process.stderr.write(`MTN check failed: ${error.code || 'CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
