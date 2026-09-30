const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const DEFAULT_IDLE_MS = 8 * 60 * 60 * 1000;
const DUMMY_HASH_PROMISE = hashPassword('invalid-account-password');

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 1) {
    throw new Error('Password is required');
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, encodedHash) {
  try {
    if (typeof password !== 'string' || typeof encodedHash !== 'string') return false;
    const [algorithm, saltHex, hashHex, extra] = encodedHash.split('$');
    if (algorithm !== 'scrypt' || !saltHex || !hashHex || extra !== undefined) return false;
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== 64) return false;
    const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function createAuthService(config, options = {}) {
  const clock = options.clock || Date.now;
  const idleMs = options.idleMs || DEFAULT_IDLE_MS;
  const maxAttempts = options.maxAttempts || 5;
  const attemptWindowMs = options.attemptWindowMs || 15 * 60 * 1000;
  const tokenBytes = options.tokenBytes || (() => randomBytes(32));
  const sessions = new Map();
  const attempts = new Map();
  const accounts = new Map([
    [config.adminUsername, { username: config.adminUsername, role: 'admin', hash: config.adminPasswordHash }],
    [config.readerUsername, { username: config.readerUsername, role: 'reader', hash: config.readerPasswordHash }],
  ]);

  function activeAttempts(username, now) {
    const recent = (attempts.get(username) || []).filter((time) => now - time < attemptWindowMs);
    attempts.set(username, recent);
    return recent;
  }

  async function login(username, password) {
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const now = clock();
    const recent = activeAttempts(normalizedUsername, now);
    if (recent.length >= maxAttempts) {
      throw authError(429, 'LOGIN_RATE_LIMITED', 'Too many login attempts. Try again later.');
    }
    recent.push(now);

    const account = accounts.get(normalizedUsername);
    const valid = await verifyPassword(password, account?.hash || await DUMMY_HASH_PROMISE);
    if (!account || !valid) {
      return null;
    }

    attempts.delete(normalizedUsername);
    const token = tokenBytes().toString('hex');
    const session = { username: account.username, role: account.role };
    sessions.set(token, { ...session, lastSeenAt: now });
    return { token, session };
  }

  function getSession(token) {
    if (!token) return null;
    const stored = sessions.get(token);
    if (!stored) return null;
    const now = clock();
    if (now - stored.lastSeenAt > idleMs) {
      sessions.delete(token);
      return null;
    }
    stored.lastSeenAt = now;
    return { username: stored.username, role: stored.role };
  }

  function logout(token) {
    return Boolean(token && sessions.delete(token));
  }

  function requireRole(token, role) {
    const session = getSession(token);
    if (!session) throw authError(401, 'UNAUTHENTICATED', 'Authentication required.');
    if (role && session.role !== role) {
      throw authError(403, 'FORBIDDEN', 'This account cannot perform that action.');
    }
    return session;
  }

  return { login, logout, getSession, requireRole };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAuthService,
};
