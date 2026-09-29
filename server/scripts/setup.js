#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const { hashPassword } = require('../src/auth');

function redactMsisdn(value) {
  const text = String(value || '');
  return `${'•'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(String(value))}`;
}

function validate(values) {
  if (!values.adminUsername?.trim() || !values.readerUsername?.trim()) throw new Error('Both usernames are required.');
  if (values.adminUsername.trim() === values.readerUsername.trim()) throw new Error('The account usernames must be different.');
  if (values.adminPassword?.length < 12 || values.readerPassword?.length < 12) throw new Error('Each password must contain at least 12 characters.');
  if (!values.consumerKey || !values.consumerSecret) throw new Error('Both MTN credentials are required.');
  for (const [label, value] of [['token URL', values.tokenUrl], ['Plans base URL', values.plansBaseUrl]]) {
    let url;
    try { url = new URL(value); } catch { throw new Error(`The MTN ${label} is invalid.`); }
    if (url.protocol !== 'https:') throw new Error(`The MTN ${label} must use HTTPS.`);
  }
}

async function writeSetup({ serverDir, values, overwrite = false }) {
  validate(values);
  const envPath = path.join(serverDir, '.env');
  const dataPath = path.join(serverDir, 'data', 'sims.json');
  if (!overwrite) {
    try { await fs.access(envPath); throw new Error('server/.env already exists; setup refused to overwrite it.'); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const [adminHash, readerHash] = await Promise.all([
    hashPassword(values.adminPassword),
    hashPassword(values.readerPassword),
  ]);
  const content = [
    envLine('HOST', '127.0.0.1'),
    envLine('PORT', '3000'),
    envLine('ADMIN_USERNAME', values.adminUsername.trim()),
    envLine('ADMIN_PASSWORD_HASH', adminHash),
    envLine('READER_USERNAME', values.readerUsername.trim()),
    envLine('READER_PASSWORD_HASH', readerHash),
    envLine('SESSION_SECRET', randomBytes(32).toString('hex')),
    envLine('MTN_CONSUMER_KEY', values.consumerKey.trim()),
    envLine('MTN_CONSUMER_SECRET', values.consumerSecret.trim()),
    envLine('MTN_TOKEN_URL', values.tokenUrl.trim()),
    envLine('MTN_PLANS_BASE_URL', values.plansBaseUrl.trim()),
    envLine('REFRESH_INTERVAL_MINUTES', '15'),
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(envPath, content, { mode: 0o600 });
  await fs.chmod(envPath, 0o600);
  try { await fs.access(dataPath); } catch { await fs.writeFile(dataPath, '{\n  "version": 1,\n  "sims": []\n}\n', { mode: 0o600 }); }
  return { envPath, dataPath };
}

async function runCli() {
  const serverDir = path.resolve(__dirname, '..');
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  const ask = async (label, fallback = '') => (await rl.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim() || fallback;
  const secret = async (label) => {
    process.stdout.write(`${label}: `);
    muted = true;
    const answer = await rl.question('');
    muted = false;
    process.stdout.write('\n');
    return answer;
  };

  try {
    let overwrite = false;
    try {
      await fs.access(path.join(serverDir, '.env'));
      overwrite = /^y(es)?$/i.test(await ask('Existing private configuration found. Replace it? (yes/no)', 'no'));
      if (!overwrite) throw new Error('Setup cancelled without changing the existing configuration.');
    } catch (error) {
      if (error.code !== 'ENOENT' && !/cancelled/.test(error.message)) throw error;
      if (/cancelled/.test(error.message)) throw error;
    }
    const values = {
      adminUsername: await ask('Administrator username', 'admin'),
      adminPassword: await secret('Administrator password (12+ characters)'),
      readerUsername: await ask('Read-only username', 'reader'),
      readerPassword: await secret('Read-only password (12+ characters)'),
      consumerKey: await secret('MTN consumer key'),
      consumerSecret: await secret('MTN consumer secret'),
      tokenUrl: await ask('MTN OAuth token URL', 'https://api.mtn.com/v1/oauth/access_token'),
      plansBaseUrl: await ask('MTN Plans base URL', 'https://api.mtn.com/v2/customers'),
    };
    await writeSetup({ serverDir, values, overwrite });
    process.stdout.write('Local Datrack configuration created. Secrets were not printed.\n');
  } finally {
    muted = false;
    rl.close();
  }
}

if (require.main === module) {
  runCli().catch((error) => {
    process.stderr.write(`Setup stopped: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { writeSetup, redactMsisdn };
