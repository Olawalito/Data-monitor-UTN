const test = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig } = require('../src/config');

function validEnv(overrides = {}) {
  return {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: 'admin-secret-hash',
    READER_USERNAME: 'reader',
    READER_PASSWORD_HASH: 'reader-secret-hash',
    SESSION_SECRET: 'session-secret-value',
    MTN_CONSUMER_KEY: 'consumer-key-value',
    MTN_CONSUMER_SECRET: 'consumer-secret-value',
    MTN_TOKEN_URL: 'https://example.test/oauth/token',
    MTN_PLANS_BASE_URL: 'https://example.test/v2/customers',
    ...overrides,
  };
}

test('uses localhost-safe runtime defaults', () => {
  const config = loadConfig(validEnv());

  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3000);
  assert.equal(config.refreshIntervalMinutes, 15);
});

test('reports every missing required variable without values', () => {
  assert.throws(
    () => loadConfig({ ADMIN_USERNAME: 'admin', SESSION_SECRET: 'do-not-print-me' }),
    (error) => {
      assert.match(error.message, /ADMIN_PASSWORD_HASH/);
      assert.match(error.message, /MTN_CONSUMER_SECRET/);
      assert.doesNotMatch(error.message, /do-not-print-me/);
      return true;
    },
  );
});

test('rejects a non-local bind address', () => {
  assert.throws(() => loadConfig(validEnv({ HOST: '0.0.0.0' })), /HOST must be 127\.0\.0\.1/);
});

test('rejects invalid ports and refresh intervals', () => {
  assert.throws(() => loadConfig(validEnv({ PORT: '70000' })), /PORT/);
  assert.throws(() => loadConfig(validEnv({ REFRESH_INTERVAL_MINUTES: '0' })), /REFRESH_INTERVAL_MINUTES/);
});
