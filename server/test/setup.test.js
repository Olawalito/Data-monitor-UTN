const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { writeSetup, redactMsisdn } = require('../scripts/setup');
const { verifyPassword } = require('../src/auth');

const values = {
  adminUsername: 'admin',
  adminPassword: 'correct horse battery staple',
  readerUsername: 'reader',
  readerPassword: 'read only battery staple',
  consumerKey: 'portal-key-value',
  consumerSecret: 'portal-secret-value',
  tokenUrl: 'https://api.mtn.com/v1/oauth/access_token',
  plansBaseUrl: 'https://api.mtn.com/v2/customers',
};

async function tempServer() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'datrack-setup-'));
}

test('writes password hashes, private env permissions, and an empty store', async () => {
  const serverDir = await tempServer();
  await writeSetup({ serverDir, values });
  const envPath = path.join(serverDir, '.env');
  const env = await fs.readFile(envPath, 'utf8');
  const stat = await fs.stat(envPath);
  const adminHash = JSON.parse(env.match(/^ADMIN_PASSWORD_HASH=(.+)$/m)[1]);
  const readerHash = JSON.parse(env.match(/^READER_PASSWORD_HASH=(.+)$/m)[1]);

  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(env.includes(values.adminPassword), false);
  assert.equal(env.includes(values.readerPassword), false);
  assert.equal(await verifyPassword(values.adminPassword, adminHash), true);
  assert.equal(await verifyPassword(values.readerPassword, readerHash), true);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(serverDir, 'data', 'sims.json'), 'utf8')), { version: 1, sims: [] });
});

test('refuses to overwrite an existing env unless explicitly allowed', async () => {
  const serverDir = await tempServer();
  await fs.writeFile(path.join(serverDir, '.env'), 'existing=true\n');
  await assert.rejects(writeSetup({ serverDir, values }), /already exists/i);
  assert.equal(await fs.readFile(path.join(serverDir, '.env'), 'utf8'), 'existing=true\n');
  await writeSetup({ serverDir, values, overwrite: true });
  assert.match(await fs.readFile(path.join(serverDir, '.env'), 'utf8'), /ADMIN_PASSWORD_HASH/);
});

test('redacts subscriber numbers in operator output', () => {
  const redacted = redactMsisdn('+2348031234567');
  assert.equal(redacted.endsWith('4567'), true);
  assert.equal(redacted.includes('803123'), false);
  assert.equal(redacted.includes('+2348031234567'), false);
});
