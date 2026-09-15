import { parseISO, parseUnix, formatTime } from './convert.mjs';

const isoInput = document.querySelector('#iso-input');
const unixInput = document.querySelector('#unix-input');
const unit = document.querySelector('#unit');
const status = document.querySelector('#status');
const copyButtons = [...document.querySelectorAll('[data-copy]')];

function clearErrors() {
  for (const name of ['iso', 'unix']) {
    document.querySelector(`#${name}-error`).textContent = '';
    document.querySelector(`#${name}-input`).removeAttribute('aria-invalid');
  }
}

function clearResults() {
  for (const button of copyButtons) {
    document.querySelector(`#result-${button.dataset.copy}`).value = '';
    button.disabled = true;
  }
}

function show(milliseconds) {
  clearErrors();
  const result = formatTime(milliseconds);
  for (const button of copyButtons) {
    document.querySelector(`#result-${button.dataset.copy}`).value = result[button.dataset.copy];
    button.disabled = false;
  }
  status.textContent = 'Converted. ISO output uses UTC.';
}

function convert(source) {
  clearErrors();
  try {
    show(source === 'iso' ? parseISO(isoInput.value) : parseUnix(unixInput.value, unit.value));
  } catch (error) {
    clearResults();
    document.querySelector(`#${source}-error`).textContent = error.message;
    document.querySelector(`#${source}-input`).setAttribute('aria-invalid', 'true');
    status.textContent = 'Check the input and try again.';
  }
}

for (const source of ['iso', 'unix']) {
  document.querySelector(`#${source}-form`).addEventListener('submit', event => {
    event.preventDefault();
    convert(source);
  });
}

for (const element of [isoInput, unixInput, unit]) {
  element.addEventListener('input', () => {
    clearErrors();
    clearResults();
    status.textContent = 'Input changed. Convert to update the result.';
  });
}

unit.addEventListener('change', () => {
  const milliseconds = unit.value === 'milliseconds';
  unixInput.placeholder = milliseconds ? '1767225600000' : '1767225600';
  document.querySelector('#unix-hint').textContent = milliseconds
    ? 'Whole milliseconds since 1970-01-01 UTC. Negative values are supported.'
    : 'Seconds since 1970-01-01 UTC. Negative values and fractional seconds are supported.';
});

document.querySelector('#now').addEventListener('click', () => {
  const milliseconds = Date.now();
  const result = formatTime(milliseconds);
  isoInput.value = result.iso;
  unixInput.value = result[unit.value];
  show(milliseconds);
  status.textContent = 'Current time captured. This is not a live clock.';
});

for (const button of copyButtons) {
  button.addEventListener('click', async () => {
    const output = document.querySelector(`#result-${button.dataset.copy}`);
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Copied to clipboard.';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Copy unavailable. Selected the value so you can copy it manually.';
    }
  });
}
