const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hashPassword,
  verifyPassword,
  createAuthService,
} = require('../src/auth');

async function authFixture(options = {}) {
  const now = { value: 1_000_000 };
  const config = {
    adminUsername: 'admin',
    adminPasswordHash: await hashPassword('correct horse'),
    readerUsername: 'reader',
    readerPasswordHash: await hashPassword('read only'),
  };
  const auth = createAuthService(config, {
    clock: () => now.value,
    idleMs: 8 * 60 * 60 * 1000,
    ...options,
  });
  return { auth, now };
}

test('hashes passwords with a unique salt and verifies only the correct password', async () => {
  const first = await hashPassword('company password');
  const second = await hashPassword('company password');

  assert.match(first, /^scrypt\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('company password', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('company password', 'not-a-hash'), false);
});

test('logs in both configured roles with opaque distinct sessions', async () => {
  const { auth } = await authFixture();

  const admin = await auth.login('admin', 'correct horse');
  const reader = await auth.login('reader', 'read only');

  assert.equal(admin.session.role, 'admin');
  assert.equal(reader.session.role, 'reader');
  assert.match(admin.token, /^[a-f0-9]{64}$/);
  assert.notEqual(admin.token, reader.token);
  assert.equal(admin.token.includes('admin'), false);
});

test('rejects unknown users and incorrect passwords without creating a session', async () => {
  const { auth } = await authFixture();

  assert.equal(await auth.login('admin', 'incorrect'), null);
  assert.equal(await auth.login('unknown', 'incorrect'), null);
  assert.equal(auth.getSession('missing'), null);
});

test('expires sessions after eight idle hours and refreshes activity before expiry', async () => {
  const { auth, now } = await authFixture();
  const login = await auth.login('admin', 'correct horse');

  now.value += 7 * 60 * 60 * 1000;
  assert.equal(auth.getSession(login.token).role, 'admin');
  now.value += 7 * 60 * 60 * 1000;
  assert.equal(auth.getSession(login.token).role, 'admin');
  now.value += 8 * 60 * 60 * 1000 + 1;
  assert.equal(auth.getSession(login.token), null);
});

test('logout invalidates the current session', async () => {
  const { auth } = await authFixture();
  const login = await auth.login('reader', 'read only');

  assert.equal(auth.logout(login.token), true);
  assert.equal(auth.getSession(login.token), null);
});

test('rate limits repeated failed logins within the configured window', async () => {
  const { auth } = await authFixture({ maxAttempts: 2, attemptWindowMs: 60_000 });

  assert.equal(await auth.login('admin', 'wrong'), null);
  assert.equal(await auth.login('admin', 'wrong'), null);
  await assert.rejects(() => auth.login('admin', 'correct horse'), (error) => error.code === 'LOGIN_RATE_LIMITED');
});

test('reserves rate-limit slots before concurrent password checks complete', async () => {
  const { auth } = await authFixture({ maxAttempts: 2, attemptWindowMs: 60_000 });

  const attempts = await Promise.allSettled(
    Array.from({ length: 10 }, () => auth.login('admin', 'wrong')),
  );
  assert.equal(attempts.filter((result) => result.status === 'fulfilled' && result.value === null).length, 2);
  assert.equal(attempts.filter((result) => result.status === 'rejected' && result.reason.code === 'LOGIN_RATE_LIMITED').length, 8);
  await assert.rejects(() => auth.login('admin', 'correct horse'), (error) => error.code === 'LOGIN_RATE_LIMITED');
});

test('enforces authentication and role requirements', async () => {
  const { auth } = await authFixture();
  const admin = await auth.login('admin', 'correct horse');
  const reader = await auth.login('reader', 'read only');

  assert.equal(auth.requireRole(admin.token, 'admin').username, 'admin');
  assert.throws(() => auth.requireRole(reader.token, 'admin'), (error) => error.status === 403);
  assert.throws(() => auth.requireRole('missing', 'reader'), (error) => error.status === 401);
});
