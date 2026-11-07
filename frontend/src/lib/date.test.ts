import {
  addDays,
  addMonths,
  dateFromQuery,
  formatLong,
  formatMonth,
  formatWeekRange,
  monthGrid,
  monthRange,
  parseDate,
  today,
  toDateString,
  weekDays,
  weekStart,
} from './date';

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

describe('weekStart', () => {
  test.each([
    ['2026-11-02', '2026-11-02'], // Pazartesi kendisi
    ['2026-11-04', '2026-11-02'],
    ['2026-11-07', '2026-11-02'], // Cumartesi
    ['2026-11-08', '2026-11-02'], // Pazar bir önceki Pazartesi'ye aittir
    ['2026-11-09', '2026-11-09'],
    ['2026-01-01', '2025-12-29'], // yıl sınırı
  ])('weekStart(%s) is %s', (value, expected) => {
    expect(weekStart(value)).toBe(expected);
  });
});

describe('weekDays', () => {
  test('gives Monday to Sunday', () => {
    expect(weekDays('2026-11-08')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });
});

describe('monthRange', () => {
  test.each([
    ['2026-02-10', '2026-02-01', '2026-02-28'],
    ['2028-02-10', '2028-02-01', '2028-02-29'],
    ['2026-12-31', '2026-12-01', '2026-12-31'],
    ['2026-11-15', '2026-11-01', '2026-11-30'],
  ])('monthRange(%s)', (value, from, to) => {
    expect(monthRange(value)).toEqual({ from, to });
  });
});

describe('monthGrid', () => {
  test('November 2026 covers 26 October to 6 December in six Monday-first rows', () => {
    const grid = monthGrid('2026-11-15');
    expect(grid).toHaveLength(6);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-10-26');
    expect(grid[5][6]).toBe('2026-12-06');
    expect(grid[1][0]).toBe('2026-11-02');
  });

  test('a month that starts on Monday and ends on Sunday has exactly the weeks it needs', () => {
    const grid = monthGrid('2026-06-10'); // 1 Haziran Pazartesi, 30 Haziran Salı
    expect(grid[0][0]).toBe('2026-06-01');
    expect(grid.at(-1)?.[6]).toBe('2026-07-05');
  });

  test('February 2027 (28 days, starts on Monday) is four rows', () => {
    const grid = monthGrid('2027-02-14');
    expect(grid).toHaveLength(4);
    expect(grid[0][0]).toBe('2027-02-01');
    expect(grid[3][6]).toBe('2027-02-28');
  });
});

describe('addMonths', () => {
  test.each([
    ['2026-11-15', -1, '2026-10-01'],
    ['2026-11-15', 1, '2026-12-01'],
    ['2026-01-31', -1, '2025-12-01'],
    ['2026-12-05', 1, '2027-01-01'],
    ['2026-03-31', 1, '2026-04-01'],
  ])('addMonths(%s, %i) is the first of %s', (value, n, expected) => {
    expect(addMonths(value, n)).toBe(expected);
  });
});

describe('formatMonth and formatWeekRange', () => {
  test('formatMonth', () => {
    expect(formatMonth('2026-11-15')).toBe('Kasım 2026');
    expect(formatMonth('2027-01-01')).toBe('Ocak 2027');
  });

  test('formatWeekRange inside one month', () => {
    expect(formatWeekRange('2026-11-07')).toBe('2 – 8 Kasım 2026');
  });

  test('formatWeekRange across months and years', () => {
    expect(formatWeekRange('2026-10-28')).toBe('26 Ekim – 1 Kasım 2026');
    expect(formatWeekRange('2026-12-31')).toBe('28 Aralık 2026 – 3 Ocak 2027');
  });
});
