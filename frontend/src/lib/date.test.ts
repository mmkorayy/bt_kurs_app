import { addDays, dateFromQuery, formatLong, parseDate, today, toDateString } from './date';

afterEach(() => vi.useRealTimers());

test('the tests run in Turkey time (UTC+3), where day-shift bugs show up', () => {
  expect(new Date(2026, 5, 1).getTimezoneOffset()).toBe(-180);
});

describe('toDateString', () => {
  test('keeps the local day late in the evening', () => {
    expect(toDateString(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
  });

  test('keeps the local day just after midnight (toISOString would give the day before)', () => {
    expect(toDateString(new Date(2026, 10, 7, 0, 30))).toBe('2026-11-07');
  });

  test('pads month and day', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseDate', () => {
  test('gives a local date for real dates', () => {
    const parsed = parseDate('2026-11-07');
    expect([parsed?.getFullYear(), parsed?.getMonth(), parsed?.getDate()]).toEqual([2026, 10, 7]);
    expect(parsed?.getHours()).toBe(0);
  });

  test.each(['2026-13-45', '2026-02-30', 'abc', '', '2026-2-3', '2026-11-07T10:00', ' 2026-11-07'])(
    'gives undefined for %j',
    (value) => {
      expect(parseDate(value)).toBeUndefined();
    },
  );

  test('knows leap days', () => {
    expect(parseDate('2028-02-29')).toBeDefined();
    expect(parseDate('2026-02-29')).toBeUndefined();
  });
});

describe('addDays', () => {
  test.each([
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-11-07', 0, '2026-11-07'],
    ['2026-11-07', 7, '2026-11-14'],
  ])('addDays(%s, %i) is %s', (start, n, expected) => {
    expect(addDays(start, n)).toBe(expected);
  });
});

describe('today', () => {
  test('is the local day even just after midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 7, 0, 30));
    expect(today()).toBe('2026-11-07');
  });
});

describe('dateFromQuery', () => {
  test('keeps a valid date', () => {
    expect(dateFromQuery('2026-11-09')).toBe('2026-11-09');
  });

  test.each([['abc'], ['2026-13-45'], [''], [null]])('falls back to today for %j', (value) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0));
    expect(dateFromQuery(value)).toBe('2026-11-07');
  });
});

describe('formatLong', () => {
  test('writes the Turkish day, month and weekday', () => {
    expect(formatLong('2026-11-07')).toBe('7 Kasım Cumartesi');
    expect(formatLong('2026-11-02')).toBe('2 Kasım Pazartesi');
    expect(formatLong('2026-11-08')).toBe('8 Kasım Pazar');
    expect(formatLong('2026-08-30')).toBe('30 Ağustos Pazar');
  });
});
