'use strict';
const duration = document.querySelector('#duration');
const clock = document.querySelector('#clock');
const toggle = document.querySelector('#toggle');
const reset = document.querySelector('#reset');
const message = document.querySelector('#message');
let remaining = Number(duration.value);
let deadline = 0;
let interval = null;
function render() {
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  clock.textContent = `${minutes}:${seconds}`;
}
function stop() {
  clearInterval(interval);
  interval = null;
  duration.disabled = false;
}
function tick() {
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  render();
  if (remaining === 0) {
    stop();
    toggle.textContent = 'Start another session';
    message.textContent = 'Session complete. Time for a break.';
  }
}
toggle.addEventListener('click', () => {
  if (interval !== null) {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    stop();
    render();
    toggle.textContent = 'Resume session';
    message.textContent = 'Session paused.';
    return;
  }
  if (remaining === 0) remaining = Number(duration.value);
  deadline = Date.now() + remaining * 1000;
  duration.disabled = true;
  toggle.textContent = 'Pause session';
  message.textContent = 'Session in progress.';
  interval = setInterval(tick, 250);
  tick();
});
function restart() {
  stop();
  remaining = Number(duration.value);
  render();
  toggle.textContent = 'Start session';
  message.textContent = 'Ready when you are.';
}
reset.addEventListener('click', restart);
duration.addEventListener('change', restart);
render();
