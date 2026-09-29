const REQUIRED_KEYS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH',
  'READER_USERNAME',
  'READER_PASSWORD_HASH',
  'SESSION_SECRET',
  'MTN_CONSUMER_KEY',
  'MTN_CONSUMER_SECRET',
  'MTN_TOKEN_URL',
  'MTN_PLANS_BASE_URL',
];

function positiveInteger(value, name, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  }
  return parsed;
}

function loadConfig(env = process.env) {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  const host = env.HOST?.trim() || '127.0.0.1';
  if (host !== '127.0.0.1') {
    throw new Error('HOST must be 127.0.0.1 for this local-only application');
  }

  const adminUsername = env.ADMIN_USERNAME.trim();
  const readerUsername = env.READER_USERNAME.trim();
  if (adminUsername === readerUsername) {
    throw new Error('ADMIN_USERNAME and READER_USERNAME must be different');
  }

  return Object.freeze({
    host,
    port: positiveInteger(env.PORT, 'PORT', 3000, 65535),
    refreshIntervalMinutes: positiveInteger(
      env.REFRESH_INTERVAL_MINUTES,
      'REFRESH_INTERVAL_MINUTES',
      15,
      1440,
    ),
    adminUsername,
    adminPasswordHash: env.ADMIN_PASSWORD_HASH.trim(),
    readerUsername,
    readerPasswordHash: env.READER_PASSWORD_HASH.trim(),
    sessionSecret: env.SESSION_SECRET,
    mtnConsumerKey: env.MTN_CONSUMER_KEY,
    mtnConsumerSecret: env.MTN_CONSUMER_SECRET,
    mtnTokenUrl: env.MTN_TOKEN_URL.trim(),
    mtnPlansBaseUrl: env.MTN_PLANS_BASE_URL.trim(),
  });
}

module.exports = { loadConfig };
