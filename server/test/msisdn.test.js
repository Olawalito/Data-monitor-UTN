const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeNigerianMsisdn, validateLabel } = require('../src/msisdn');

test('normalizes supported Nigerian number formats to E.164', () => {
  assert.equal(normalizeNigerianMsisdn('08012345678'), '+2348012345678');
  assert.equal(normalizeNigerianMsisdn('2348012345678'), '+2348012345678');
  assert.equal(normalizeNigerianMsisdn('+2348012345678'), '+2348012345678');
  assert.equal(normalizeNigerianMsisdn(' 0801 234 5678 '), '+2348012345678');
});

test('rejects numbers from another country or with the wrong length', () => {
  assert.throws(() => normalizeNigerianMsisdn('+447700900123'), /Nigerian/);
  assert.throws(() => normalizeNigerianMsisdn('0801234567'), /Nigerian/);
  assert.throws(() => normalizeNigerianMsisdn('+23480123456789'), /Nigerian/);
});

test('rejects letters and unsupported punctuation', () => {
  assert.throws(() => normalizeNigerianMsisdn('08012abc678'), /Nigerian/);
  assert.throws(() => normalizeNigerianMsisdn('0801-234-5678'), /Nigerian/);
});

test('requires a trimmed label no longer than 80 characters', () => {
  assert.equal(validateLabel('  Sales Router  '), 'Sales Router');
  assert.throws(() => validateLabel('   '), /Label is required/);
  assert.throws(() => validateLabel('x'.repeat(81)), /80 characters/);
});
