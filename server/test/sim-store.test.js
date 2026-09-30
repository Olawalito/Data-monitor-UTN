const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createSimStore } = require('../src/sim-store');

const EMPTY = { version: 1, sims: [] };

async function fixture(document = EMPTY) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'datrack-store-'));
  const filePath = path.join(directory, 'sims.json');
  if (document !== null) await fs.writeFile(filePath, JSON.stringify(document));
  const store = createSimStore({ filePath });
  return { directory, filePath, store };
}

test('requires setup to create an initial valid store', async () => {
  const { store } = await fixture(null);
  await assert.rejects(() => store.init(), /No valid SIM data file or backup/);
});

test('adds normalized pending records and rejects duplicates without changing state', async () => {
  const { store } = await fixture();
  await store.init();

  const added = await store.add({ label: ' Router One ', msisdn: '08012345678' });
  assert.equal(added.label, 'Router One');
  assert.equal(added.msisdn, '+2348012345678');
  assert.equal(added.status, 'pending');
  assert.equal(added.balance, null);

  await assert.rejects(
    () => store.add({ label: 'Duplicate', msisdn: '+2348012345678' }),
    (error) => error.code === 'DUPLICATE_MSISDN',
  );
  assert.equal((await store.list()).length, 1);
});

test('updates and removes records while rejecting invalid complete documents', async () => {
  const { store } = await fixture();
  await store.init();
  const added = await store.add({ label: 'Router', msisdn: '08012345678' });

  const updated = await store.update(added.id, {
    balance: 2048,
    balanceUnit: 'MB',
    expiresAt: '2026-10-31T23:59:59Z',
    lastAttemptAt: '2026-09-29T14:00:00Z',
    lastSuccessAt: '2026-09-29T14:00:00Z',
    status: 'fresh',
    errorCode: null,
  });
  assert.equal(updated.balance, 2048);
  assert.equal(updated.status, 'fresh');

  await assert.rejects(() => store.update(added.id, { status: 'unknown' }), /Invalid SIM document/);
  assert.equal((await store.list())[0].status, 'fresh');
  assert.equal(await store.remove(added.id), true);
  assert.deepEqual(await store.list(), []);
});

test('serializes overlapping writes and leaves no temporary files', async () => {
  const { directory, store } = await fixture();
  await store.init();

  await Promise.all([
    store.add({ label: 'First', msisdn: '08012345678' }),
    store.add({ label: 'Second', msisdn: '08123456789' }),
  ]);

  assert.deepEqual((await store.list()).map((sim) => sim.label).sort(), ['First', 'Second']);
  assert.equal((await fs.readdir(directory)).some((name) => name.includes('.tmp')), false);
});

test('preserves the previous valid document as a backup', async () => {
  const { filePath, store } = await fixture();
  await store.init();
  const first = await store.add({ label: 'First', msisdn: '08012345678' });
  await store.add({ label: 'Second', msisdn: '08123456789' });

  const backup = JSON.parse(await fs.readFile(`${filePath}.bak`, 'utf8'));
  assert.deepEqual(backup.sims.map((sim) => sim.id), [first.id]);
});

test('recovers a corrupt primary file from a valid backup', async () => {
  const valid = {
    version: 1,
    sims: [{
      id: '11111111-1111-4111-8111-111111111111',
      label: 'Recovered',
      msisdn: '+2348012345678',
      balance: null,
      balanceUnit: null,
      expiresAt: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      status: 'pending',
      errorCode: null,
    }],
  };
  const { filePath, store } = await fixture(null);
  await fs.writeFile(filePath, '{broken');
  await fs.writeFile(`${filePath}.bak`, JSON.stringify(valid));

  await store.init();

  assert.equal((await store.list())[0].label, 'Recovered');
  assert.deepEqual(JSON.parse(await fs.readFile(filePath, 'utf8')), valid);
});

test('fails safely without overwriting when primary and backup are corrupt', async () => {
  const { filePath, store } = await fixture(null);
  await fs.writeFile(filePath, 'primary-broken');
  await fs.writeFile(`${filePath}.bak`, 'backup-broken');

  await assert.rejects(() => store.init(), /No valid SIM data file or backup/);

  assert.equal(await fs.readFile(filePath, 'utf8'), 'primary-broken');
  assert.equal(await fs.readFile(`${filePath}.bak`, 'utf8'), 'backup-broken');
});
