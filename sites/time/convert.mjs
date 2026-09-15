const LIMIT = 8640000000000000n;

export function parseUnix(value, unit) {
  const text = value.trim();
  if (unit !== 'seconds' && unit !== 'milliseconds') throw new Error('Choose seconds or milliseconds.');
  const pattern = unit === 'seconds' ? /^([+-]?)(\d+)(?:\.(\d{1,3}))?$/ : /^([+-]?)(\d+)$/;
  const match = pattern.exec(text);
  if (!match) throw new Error(unit === 'seconds'
    ? 'Enter Unix seconds, with at most 3 decimal places.'
    : 'Enter Unix milliseconds as a whole number.');
  const sign = match[1] === '-' ? -1n : 1n;
  const milliseconds = sign * (unit === 'seconds'
    ? BigInt(match[2]) * 1000n + BigInt((match[3] || '').padEnd(3, '0'))
    : BigInt(match[2]));
  if (milliseconds < -LIMIT || milliseconds > LIMIT) throw new Error('Timestamp is outside the supported date range.');
  return Number(milliseconds);
}

export function parseISO(value) {
  const match = /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value.trim());
  if (!match) throw new Error('Use YYYY-MM-DDTHH:mm:ss.sssZ or an explicit offset such as +02:00. Fractions may have 1 to 3 digits.');
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone, sign, zoneHour = '0', zoneMinute = '0'] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (yearText === '-000000' || month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || hour > 23 || minute > 59 || second > 59 || Number(zoneHour) > 23 || Number(zoneMinute) > 59) {
    throw new Error('Invalid calendar date or time. Leap seconds and 24:00 are not supported.');
  }
  // Avoid Date.UTC's special handling of years 0 through 99.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, Number(fraction.padEnd(3, '0')));
  const offset = zone === 'Z' ? 0 : (sign === '-' ? -1 : 1) * (Number(zoneHour) * 60 + Number(zoneMinute)) * 60000;
  const milliseconds = date.getTime() - offset;
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > Number(LIMIT)) throw new Error('Date is outside the supported range.');
  return milliseconds;
}

export function formatTime(milliseconds) {
  const value = BigInt(milliseconds);
  const absolute = value < 0n ? -value : value;
  const fraction = (absolute % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  const seconds = `${value < 0n ? '-' : ''}${absolute / 1000n}${fraction ? '.' + fraction : ''}`;
  return {
    iso: new Date(milliseconds).toISOString(),
    seconds,
    milliseconds: value.toString(),
    local: new Date(milliseconds).toString(),
  };
}
