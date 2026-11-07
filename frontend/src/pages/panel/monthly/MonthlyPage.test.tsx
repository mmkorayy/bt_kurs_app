import { fireEvent, screen } from '@testing-library/react';
import { App } from '../../../App';
import type { AppointmentView } from '../../../api/types';
import { DEMO_USER, renderApp, stubFetch } from '../../../test-utils';

const ME = 'GET /api/v1/auth/me';
const NOVEMBER = 'GET /api/v1/appointments?from=2026-11-01&to=2026-11-30';
const DECEMBER = 'GET /api/v1/appointments?from=2026-12-01&to=2026-12-31';
const SATURDAY = 'GET /api/v1/appointments?from=2026-11-07&to=2026-11-07';

const me = () => ({ body: { user: DEMO_USER } });

function appointment(id: string, date: string, status: AppointmentView['status'] = 'scheduled'): AppointmentView {
  return {
    id,
    userId: 'u1',
    clientId: 'c1',
    date,
    startTime: '09:00',
    endTime: '10:00',
    status,
    note: '',
    client: { id: 'c1', firstName: 'Elif', lastName: 'Yıldız' },
  };
}

const LIST = [
  appointment('a1', '2026-11-07'),
  appointment('a2', '2026-11-07'),
  appointment('a3', '2026-11-07', 'cancelled'),
  appointment('a4', '2026-11-09'),
  appointment('a5', '2026-11-10', 'cancelled'),
];

function openMonthly(query = '?tarih=2026-11-15') {
  renderApp(<App />, { route: `/panel/ay${query}` });
}

afterEach(() => vi.useRealTimers());

test('asks once for the whole month and shows the number of active appointments on each day', async () => {
  const { calls } = stubFetch({ [ME]: me, [NOVEMBER]: () => ({ body: { appointments: LIST } }) });
  openMonthly();
  expect(await screen.findByRole('heading', { level: 1, name: 'Kasım 2026' })).toBeTruthy();
  expect(await screen.findByRole('link', { name: '7 Kasım Cumartesi, 2 randevu' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '9 Kasım Pazartesi, 1 randevu' })).toBeTruthy();
  // Yalnızca iptal edilmiş randevusu olan gün boş sayılır.
  expect(screen.getByRole('link', { name: '10 Kasım Salı' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '11 Kasım Çarşamba' })).toBeTruthy();
  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments'))).toHaveLength(1);
});

test('the grid starts on Monday, has seven weekday headings and dims days of other months', async () => {
  stubFetch({ [ME]: me, [NOVEMBER]: () => ({ body: { appointments: [] } }) });
  openMonthly();
  // Başlık yüklenirken de görünür; tablo yalnızca veri gelince çizilir, onu bekle.
  const headings = (await screen.findAllByRole('columnheader')).map((h) => h.textContent);
  expect(headings).toEqual(['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']);
  const cells = screen.getAllByRole('cell');
  expect(cells).toHaveLength(42);
  expect(cells[0].querySelector('a')?.getAttribute('aria-label')).toBe('26 Ekim Pazartesi');
  expect(cells[0].className).toContain('monthly-day-outside');
  expect(cells[6].querySelector('a')?.getAttribute('aria-label')).toBe('1 Kasım Pazar');
  expect(cells[6].className).not.toContain('monthly-day-outside');
  expect(cells[41].className).toContain('monthly-day-outside');
});

test('clicking a day opens the daily view for that day', async () => {
  stubFetch({
    [ME]: me,
    [NOVEMBER]: () => ({ body: { appointments: LIST } }),
    [SATURDAY]: () => ({ body: { appointments: [LIST[0]] } }),
  });
  openMonthly();
  const link = await screen.findByRole('link', { name: '7 Kasım Cumartesi, 2 randevu' });
  expect(link.getAttribute('href')).toBe('/panel?tarih=2026-11-07');
  fireEvent.click(link);
  expect(await screen.findByRole('heading', { level: 1, name: '7 Kasım Cumartesi' })).toBeTruthy();
  expect(await screen.findByText('09:00–10:00')).toBeTruthy();
});

test('the arrows move one month and "Bu ay" returns to this month', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 30, 23, 30));
  stubFetch({
    [ME]: me,
    [NOVEMBER]: () => ({ body: { appointments: LIST } }),
    [DECEMBER]: () => ({ body: { appointments: [] } }),
  });
  openMonthly();
  await screen.findByRole('link', { name: '9 Kasım Pazartesi, 1 randevu' });
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki ay' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Aralık 2026' })).toBeTruthy();
  expect(await screen.findByText('Bu ay için randevu yok')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bu ay' }));
  expect(await screen.findByRole('link', { name: '9 Kasım Pazartesi, 1 randevu' })).toBeTruthy();
});

test.each(['?tarih=abc', '?tarih=2026-13-45', ''])('a bad or missing date (%j) shows the current month', async (query) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 1, 0, 30));
  stubFetch({ [ME]: me, [NOVEMBER]: () => ({ body: { appointments: LIST } }) });
  openMonthly(query);
  expect(await screen.findByRole('link', { name: '7 Kasım Cumartesi, 2 randevu' })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: 'Kasım 2026' })).toBeTruthy();
});

test('shows a loading text', async () => {
  stubFetch({ [ME]: me, [NOVEMBER]: () => new Promise(() => undefined) });
  openMonthly();
  expect(await screen.findByText('Ay yükleniyor…')).toBeTruthy();
});

test('an error shows the message and "Yeniden dene" loads again', async () => {
  let calls = 0;
  stubFetch({
    [ME]: me,
    [NOVEMBER]: () => {
      calls += 1;
      return calls === 1
        ? { status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }
        : { body: { appointments: LIST } };
    },
  });
  openMonthly();
  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByRole('link', { name: '7 Kasım Cumartesi, 2 randevu' })).toBeTruthy();
});
