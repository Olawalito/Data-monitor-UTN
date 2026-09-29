const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { hashPassword, createAuthService } = require('../src/auth');
const { createSimStore } = require('../src/sim-store');
const { createApp } = require('../src/app');

async function fixture({ withStatic = false, dottedStaticPath = false } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'datrack-api-'));
  const dataPath = path.join(directory, 'sims.json');
  await fs.writeFile(dataPath, JSON.stringify({ version: 1, sims: [] }));
  const store = createSimStore({ filePath: dataPath });
  await store.init();
  const config = {
    host: '127.0.0.1',
    port: 3000,
    adminUsername: 'admin',
    adminPasswordHash: await hashPassword('admin password'),
    readerUsername: 'reader',
    readerPasswordHash: await hashPassword('reader password'),
  };
  const auth = createAuthService(config);
  const refreshService = {
    async refreshOne(id) {
      return store.update(id, {
        balance: 750,
        balanceUnit: 'MB',
        expiresAt: '2026-10-31T00:00:00.000Z',
        lastAttemptAt: '2026-09-29T15:00:00.000Z',
        lastSuccessAt: '2026-09-29T15:00:00.000Z',
        status: 'fresh',
        errorCode: null,
      });
    },
    async refreshAll() {
      const results = [];
      for (const sim of await store.list()) results.push(await this.refreshOne(sim.id));
      return results;
    },
  };
  let staticDir;
  if (withStatic) {
    staticDir = dottedStaticPath ? path.join(directory, '.worktree', 'dist') : path.join(directory, 'dist');
    await fs.mkdir(staticDir, { recursive: true });
    await fs.writeFile(path.join(staticDir, 'index.html'), '<!doctype html><title>Datrack app</title>');
  }
  return { app: createApp({ config, auth, store, refreshService, staticDir }), store };
}

function login(agent, username, password) {
  return agent
    .post('/api/auth/login')
    .set('Origin', 'http://127.0.0.1:3000')
    .send({ username, password });
}

test('reports health without exposing configuration or secrets', async () => {
  const { app } = await fixture();
  const response = await request(app).get('/api/health').expect(200);

  assert.deepEqual(response.body, { data: { status: 'ready' } });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(response.body), /password|consumer/i);
});

test('logs in, restores the session, and logs out with a protected cookie', async () => {
  const { app } = await fixture();
  const agent = request.agent(app);

  const signedIn = await login(agent, 'admin', 'admin password').expect(200);
  const cookie = signedIn.headers['set-cookie'][0];
  assert.match(cookie, /datrack_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.deepEqual(signedIn.body, { data: { username: 'admin', role: 'admin' } });

  const session = await agent.get('/api/auth/session').expect(200);
  assert.deepEqual(session.body, { data: { username: 'admin', role: 'admin' } });

  await agent.post('/api/auth/logout').set('Origin', 'http://127.0.0.1:3000').send({}).expect(200);
  await agent.get('/api/auth/session').expect(401);
});

test('returns a consistent safe error for invalid credentials and unauthenticated access', async () => {
  const { app } = await fixture();
  const failed = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' }).expect(401);
  assert.deepEqual(failed.body, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' } });

  const response = await request(app).get('/api/sims').expect(401);
  assert.deepEqual(response.body, { error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } });
});

test('returns full admin numbers but masks reader numbers', async () => {
  const { app, store } = await fixture();
  await store.add({ label: 'Sales Router', msisdn: '08012345678' });
  const admin = request.agent(app);
  const reader = request.agent(app);
  await login(admin, 'admin', 'admin password').expect(200);
  await login(reader, 'reader', 'reader password').expect(200);

  assert.equal((await admin.get('/api/sims').expect(200)).body.data[0].msisdn, '+2348012345678');
  const masked = (await reader.get('/api/sims').expect(200)).body.data[0].msisdn;
  assert.equal(masked.endsWith('5678'), true);
  assert.equal(masked.includes('+23480123'), false);
});

test('lets an admin add, refresh, and remove a SIM', async () => {
  const { app } = await fixture();
  const admin = request.agent(app);
  await login(admin, 'admin', 'admin password').expect(200);

  const created = await admin.post('/api/sims').send({ label: 'Sales', msisdn: '08012345678' }).expect(201);
  assert.equal(created.body.data.status, 'pending');

  const refreshed = await admin.post(`/api/sims/${created.body.data.id}/refresh`).send({}).expect(200);
  assert.equal(refreshed.body.data.balance, 750);

  await admin.delete(`/api/sims/${created.body.data.id}`).send({}).expect(200);
  assert.deepEqual((await admin.get('/api/sims')).body.data, []);
});

test('rejects reader mutations through the API', async () => {
  const { app } = await fixture();
  const reader = request.agent(app);
  await login(reader, 'reader', 'reader password').expect(200);

  const response = await reader.post('/api/sims').send({ label: 'No', msisdn: '08012345678' }).expect(403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('rejects malformed and duplicate numbers without changing stored rows', async () => {
  const { app } = await fixture();
  const admin = request.agent(app);
  await login(admin, 'admin', 'admin password').expect(200);

  await admin.post('/api/sims').send({ label: 'Bad', msisdn: '+447700900123' }).expect(400);
  await admin.post('/api/sims').send({ label: 'Good', msisdn: '08012345678' }).expect(201);
  const duplicate = await admin.post('/api/sims').send({ label: 'Duplicate', msisdn: '+2348012345678' }).expect(409);

  assert.equal(duplicate.body.error.code, 'DUPLICATE_MSISDN');
  assert.equal((await admin.get('/api/sims')).body.data.length, 1);
});

test('requires JSON mutations and rejects foreign origins', async () => {
  const { app } = await fixture();
  const admin = request.agent(app);
  await login(admin, 'admin', 'admin password').expect(200);

  await admin.post('/api/sims').set('Content-Type', 'text/plain').send('not json').expect(415);
  const foreign = await admin
    .post('/api/sims')
    .set('Origin', 'https://evil.example')
    .send({ label: 'No', msisdn: '08012345678' })
    .expect(403);
  assert.equal(foreign.body.error.code, 'INVALID_ORIGIN');
});

test('serves the production SPA without turning unknown API routes into HTML', async () => {
  const { app } = await fixture({ withStatic: true });
  const spa = await request(app).get('/dashboard').expect(200);
  assert.match(spa.text, /Datrack app/);

  const missing = await request(app).get('/api/missing').expect(404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
});

test('serves the SPA when the checkout path contains a hidden directory segment', async () => {
  const { app } = await fixture({ withStatic: true, dottedStaticPath: true });
  const spa = await request(app).get('/dashboard').expect(200);
  assert.match(spa.text, /Datrack app/);
});
