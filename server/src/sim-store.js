const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { normalizeNigerianMsisdn, validateLabel } = require('./msisdn');

const STATUSES = new Set(['pending', 'fresh', 'stale', 'error']);
const UPDATE_FIELDS = new Set([
  'balance',
  'balanceUnit',
  'expiresAt',
  'lastAttemptAt',
  'lastSuccessAt',
  'status',
  'errorCode',
]);

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function validTimestamp(value) {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function validRecord(record) {
  return record
    && typeof record === 'object'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.id)
    && typeof record.label === 'string'
    && record.label.length > 0
    && record.label.length <= 80
    && /^\+234\d{10}$/.test(record.msisdn)
    && (record.balance === null || (typeof record.balance === 'number' && Number.isFinite(record.balance) && record.balance >= 0))
    && isNullableString(record.balanceUnit)
    && validTimestamp(record.expiresAt)
    && validTimestamp(record.lastAttemptAt)
    && validTimestamp(record.lastSuccessAt)
    && STATUSES.has(record.status)
    && isNullableString(record.errorCode);
}

function validateDocument(document) {
  if (!document || document.version !== 1 || !Array.isArray(document.sims)) {
    throw new Error('Invalid SIM document');
  }
  if (!document.sims.every(validRecord)) {
    throw new Error('Invalid SIM document');
  }
  const numbers = new Set(document.sims.map((sim) => sim.msisdn));
  const ids = new Set(document.sims.map((sim) => sim.id));
  if (numbers.size !== document.sims.length || ids.size !== document.sims.length) {
    throw new Error('Invalid SIM document');
  }
  return document;
}

function clone(value) {
  return structuredClone(value);
}

function createSimStore({ filePath, fsImpl = fs }) {
  const backupPath = `${filePath}.bak`;
  let document = null;
  let queue = Promise.resolve();

  async function readValid(candidatePath) {
    try {
      const parsed = JSON.parse(await fsImpl.readFile(candidatePath, 'utf8'));
      return validateDocument(parsed);
    } catch {
      return null;
    }
  }

  async function writeFileSynced(target, content) {
    const handle = await fsImpl.open(target, 'w', 0o600);
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  async function writeAtomic(next, preserveCurrent = true) {
    validateDocument(next);
    await fsImpl.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFileSynced(tempPath, `${JSON.stringify(next, null, 2)}\n`);
      if (preserveCurrent) await fsImpl.copyFile(filePath, backupPath);
      await fsImpl.rename(tempPath, filePath);
    } catch (error) {
      await fsImpl.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  function enqueue(operation) {
    const current = queue.then(operation, operation);
    queue = current.catch(() => {});
    return current;
  }

  async function init() {
    const primary = await readValid(filePath);
    if (primary) {
      document = clone(primary);
      return;
    }
    const backup = await readValid(backupPath);
    if (!backup) throw new Error('No valid SIM data file or backup. Run setup or restore a backup.');
    await writeAtomic(backup, false);
    document = clone(backup);
  }

  function ensureInitialized() {
    if (!document) throw new Error('SIM store is not initialized');
  }

  async function commit(next) {
    validateDocument(next);
    await writeAtomic(next);
    document = next;
  }

  async function list() {
    ensureInitialized();
    await queue;
    return clone(document.sims);
  }

  function add({ label, msisdn }) {
    return enqueue(async () => {
      ensureInitialized();
      const normalized = normalizeNigerianMsisdn(msisdn);
      const safeLabel = validateLabel(label);
      if (document.sims.some((sim) => sim.msisdn === normalized)) {
        const error = new Error('This MTN number is already approved');
        error.code = 'DUPLICATE_MSISDN';
        throw error;
      }
      const record = {
        id: randomUUID(),
        label: safeLabel,
        msisdn: normalized,
        balance: null,
        balanceUnit: null,
        expiresAt: null,
        lastAttemptAt: null,
        lastSuccessAt: null,
        status: 'pending',
        errorCode: null,
      };
      await commit({ version: 1, sims: [...document.sims, record] });
      return clone(record);
    });
  }

  function remove(id) {
    return enqueue(async () => {
      ensureInitialized();
      const sims = document.sims.filter((sim) => sim.id !== id);
      if (sims.length === document.sims.length) return false;
      await commit({ version: 1, sims });
      return true;
    });
  }

  function update(id, patch) {
    return enqueue(async () => {
      ensureInitialized();
      const index = document.sims.findIndex((sim) => sim.id === id);
      if (index === -1) {
        const error = new Error('SIM not found');
        error.code = 'SIM_NOT_FOUND';
        throw error;
      }
      const unexpected = Object.keys(patch).filter((key) => !UPDATE_FIELDS.has(key));
      if (unexpected.length) throw new Error('Invalid SIM document');
      const updated = { ...document.sims[index], ...patch };
      const sims = document.sims.slice();
      sims[index] = updated;
      await commit({ version: 1, sims });
      return clone(updated);
    });
  }

  return { init, list, add, remove, update };
}

module.exports = { createSimStore, validateDocument };
