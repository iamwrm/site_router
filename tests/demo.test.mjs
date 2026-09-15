import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('timer starts, pauses, resumes, completes, resets, and changes duration', () => {
  const elements = Object.fromEntries(['duration', 'clock', 'toggle', 'reset', 'message'].map(id => [id, {
    value: '1500', textContent: '', disabled: false,
    addEventListener(event, handler) { this[event] = handler; },
  }]));
  let now = 0;
  let tick;
  runInNewContext(readFileSync(new URL('../sites/demo/app.js', import.meta.url), 'utf8'), {
    document: { querySelector: selector => elements[selector.slice(1)] },
    Date: { now: () => now },
    setInterval: handler => { tick = handler; return 1; },
    clearInterval: () => { tick = null; },
  });
  assert.equal(elements.clock.textContent, '25:00');
  elements.toggle.click();
  assert.equal(elements.duration.disabled, true);
  now = 1000;
  tick();
  assert.equal(elements.clock.textContent, '24:59');
  elements.toggle.click();
  assert.equal(elements.duration.disabled, false);
  assert.equal(tick, null);
  assert.equal(elements.toggle.textContent, 'Resume session');
  elements.toggle.click();
  now = 1500000;
  tick();
  assert.equal(elements.clock.textContent, '00:00');
  assert.equal(tick, null);
  assert.equal(elements.message.textContent, 'Session complete. Time for a break.');
  elements.reset.click();
  assert.equal(elements.clock.textContent, '25:00');
  assert.equal(elements.toggle.textContent, 'Start session');
  elements.duration.value = '300';
  elements.duration.change();
  assert.equal(elements.clock.textContent, '05:00');
});
