import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('homepage search filters names, descriptions, and paths without case sensitivity', () => {
  const rows = [
    ['Focus timer A simple timer with 5, 15, and 25 minute sessions.', './demo/'],
    ['Time converter Convert ISO 8601 dates and Unix timestamps.', './time/'],
  ].map(([textContent, href]) => ({
    textContent,
    hidden: false,
    querySelector: () => ({ getAttribute: () => href }),
  }));
  const search = { value: '', addEventListener(event, handler) { this[event] = handler; } };
  const status = { textContent: '' };
  const empty = { hidden: true };
  const container = { hidden: true };
  const elements = { '#site-search': search, '#search-status': status, '#search-empty': empty, '.site-search': container };
  runInNewContext(readFileSync(new URL('../sites/app.js', import.meta.url), 'utf8'), {
    document: {
      querySelector: selector => elements[selector],
      querySelectorAll: () => rows,
    },
  });
  assert.equal(container.hidden, false);
  assert.equal(status.textContent, '2 of 2 sites');
  for (const [query, hidden] of [
    [' FOCUS ', [false, true]],
    ['unix', [true, false]],
    ['/demo/', [false, true]],
    ['ISO  converter', [true, false]],
    ['missing', [true, true]],
    ['<script>', [true, true]],
    ['', [false, false]],
    ['   ', [false, false]],
  ]) {
    search.value = query;
    search.input();
    assert.deepEqual(rows.map(row => row.hidden), hidden, query);
    const count = hidden.filter(value => !value).length;
    assert.equal(status.textContent, `${count} of 2 sites`, query);
    assert.equal(empty.hidden, count !== 0, query);
  }
});
