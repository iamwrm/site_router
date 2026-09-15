import test from 'node:test';
import assert from 'node:assert/strict';
import { parseISO, parseUnix, formatTime } from '../sites/time/convert.mjs';

test('Unix epoch and explicit units', () => {
  assert.equal(parseISO('1970-01-01T00:00:00Z'), 0);
  assert.equal(parseUnix('1000', 'seconds'), 1000000);
  assert.equal(parseUnix('1000', 'milliseconds'), 1000);
  assert.equal(formatTime(0).iso, '1970-01-01T00:00:00.000Z');
});

test('timezone offsets refer to the same moment', () => {
  assert.equal(parseISO('2026-01-01T05:30:00+05:30'), parseISO('2026-01-01T00:00:00Z'));
  assert.equal(parseISO('1969-12-31T19:00:00-05:00'), 0);
  assert.equal(parseISO('1970-01-01T00:00:00-00:00'), 0);
});

test('fractions and negative timestamps retain millisecond precision', () => {
  assert.equal(parseUnix('-0.001', 'seconds'), -1);
  assert.equal(parseUnix('  +1.01  ', 'seconds'), 1010);
  assert.equal(parseISO('1970-01-01T00:00:00.1Z'), 100);
  assert.equal(parseISO('1970-01-01T00:00:00.012Z'), 12);
  assert.equal(formatTime(-1).seconds, '-0.001');
  assert.equal(formatTime(-1010).seconds, '-1.01');
  assert.equal(formatTime(-1).iso, '1969-12-31T23:59:59.999Z');
});

test('leap days and years below 100', () => {
  for (const year of ['0000', '0096', '2000', '2024']) {
    assert.equal(formatTime(parseISO(`${year}-02-29T00:00:00Z`)).iso, `${year}-02-29T00:00:00.000Z`);
  }
  for (const year of ['1900', '2023', '2100']) {
    assert.throws(() => parseISO(`${year}-02-29T00:00:00Z`));
  }
});

test('invalid and ambiguous ISO input is rejected, never normalized', () => {
  for (const value of ['', '2026-01-01', '2026-01-01T00:00:00', '2026-01-01T00:00Z',
    '2026-02-30T00:00:00Z', '2026-04-31T00:00:00Z', '2026-00-01T00:00:00Z',
    '2026-13-01T00:00:00Z', '2026-01-00T00:00:00Z', '2026-01-01T24:00:00Z',
    '2026-01-01T00:60:00Z', '2026-01-01T00:00:60Z', '2026-01-01T00:00:00+24:00',
    '2026-01-01T00:00:00+00:60', '2026-01-01T00:00:00.1234Z', '-000000-01-01T00:00:00Z']) {
    assert.throws(() => parseISO(value), value);
  }
});

test('Unix input rejects invalid values, unsafe range, and excess precision', () => {
  for (const value of ['', 'NaN', 'Infinity', '1e3', '0x10', '1,000', '1.0001', '12abc', '.', '--1', '8640000000000.001']) {
    assert.throws(() => parseUnix(value, 'seconds'), value);
  }
  for (const value of ['0.1', '8640000000000001', '-8640000000000001']) {
    assert.throws(() => parseUnix(value, 'milliseconds'), value);
  }
  assert.throws(() => parseUnix('1', 'minutes'));
});

test('date range boundaries and extended ISO years round-trip exactly', () => {
  for (const value of [-8640000000000000, -8640000000000000 + 1, -1001, -1, 0, 1, 1767225600123, 8640000000000000 - 1, 8640000000000000]) {
    const result = formatTime(value);
    assert.equal(parseUnix(result.seconds, 'seconds'), value);
    assert.equal(parseUnix(result.milliseconds, 'milliseconds'), value);
    assert.equal(parseISO(result.iso), value);
  }
});
