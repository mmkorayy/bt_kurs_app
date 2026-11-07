import { fireEvent, screen, within } from '@testing-library/react';
import { App } from '../../../App';
import type { AppointmentView } from '../../../api/types';
import { DEMO_USER, renderApp, stubFetch } from '../../../test-utils';

const ME = 'GET /api/v1/auth/me';
const WEEK = 'GET /api/v1/appointments?from=2026-11-02&to=2026-11-08';
const NEXT_WEEK = 'GET /api/v1/appointments?from=2026-11-09&to=2026-11-15';
const SATURDAY = 'GET /api/v1/appointments?from=2026-11-07&to=2026-11-07';

const me = () => ({ body: { user: DEMO_USER } });

function appointment(over: Partial<AppointmentView>): AppointmentView {
  return {
    id: 'a1',
    userId: 'u1',
    clientId: 'c1',
    date: '2026-11-02',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    note: '',
    client: { id: 'c1', firstName: 'Elif', lastName: 'Yıldız' },
    ...over,
  };
}

const MON = appointment({});
const SAT_A = appointment({ id: 'a2', date: '2026-11-07', startTime: '11:00', endTime: '12:00', client: { id: 'c2', firstName: 'Can', lastName: 'Demir' } });
const SAT_B = appointment({
  id: 'a3',
  date: '2026-11-07',
  startTime: '15:00',
  endTime: '16:00',
  status: 'cancelled',
  client: { id: 'c3', firstName: 'Selin', lastName: 'Kaya' },
});
const SUN = appointment({ id: 'a4', date: '2026-11-08', startTime: '10:00', endTime: '11:00', client: { id: 'c4', firstName: 'Mert', lastName: 'Aydın' } });

function openWeekly(query = '?tarih=2026-11-07') {
  renderApp(<App />, { route: `/panel/hafta${query}` });
}

afterEach(() => vi.useRealTimers());

test('asks once for Monday to Sunday and shows each appointment under its own day', async () => {
  const { calls } = stubFetch({ [ME]: me, [WEEK]: () => ({ body: { appointments: [MON, SAT_A, SAT_B, SUN] } }) });
  openWeekly();
  expect(await screen.findByRole('heading', { level: 1, name: '2 – 8 Kasım 2026' })).toBeTruthy();
  await screen.findByText('Can Demir');

  const monday = screen.getByRole('region', { name: '2 Kasım Pazartesi' });
  expect(within(monday).getByText('Elif Yıldız')).toBeTruthy();
  expect(within(monday).getByText('09:00')).toBeTruthy();
  const saturday = screen.getByRole('region', { name: '7 Kasım Cumartesi' });
  expect(within(saturday).getByText('Can Demir')).toBeTruthy();
  expect(within(saturday).getByText('Selin Kaya')).toBeTruthy();
  expect(within(saturday).queryByText('Elif Yıldız')).toBeNull();
  const sunday = screen.getByRole('region', { name: '8 Kasım Pazar' });
  expect(within(sunday).getByText('Mert Aydın')).toBeTruthy();

  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments'))).toHaveLength(1);
});

test('the seven days run Monday to Sunday', async () => {
  stubFetch({ [ME]: me, [WEEK]: () => ({ body: { appointments: [] } }) });
  openWeekly();
  await screen.findByRole('region', { name: '2 Kasım Pazartesi' });
  const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'));
  expect(names).toEqual([
    '2 Kasım Pazartesi',
    '3 Kasım Salı',
    '4 Kasım Çarşamba',
    '5 Kasım Perşembe',
    '6 Kasım Cuma',
    '7 Kasım Cumartesi',
    '8 Kasım Pazar',
  ]);
});

test('a cancelled appointment is marked as cancelled', async () => {
  stubFetch({ [ME]: me, [WEEK]: () => ({ body: { appointments: [SAT_B] } }) });
  openWeekly();
  const item = (await screen.findByText('Selin Kaya')).closest('li')!;
  expect(within(item).getByText('İptal')).toBeTruthy();
});

test('clicking a day opens the daily view for that day', async () => {
  stubFetch({
    [ME]: me,
    [WEEK]: () => ({ body: { appointments: [SAT_A] } }),
    [SATURDAY]: () => ({ body: { appointments: [SAT_A] } }),
  });
  openWeekly();
  await screen.findByText('Can Demir');
  const link = screen.getByRole('link', { name: '7 Kasım Cumartesi' });
  expect(link.getAttribute('href')).toBe('/panel?tarih=2026-11-07');
  fireEvent.click(link);
  expect(await screen.findByRole('heading', { level: 1, name: '7 Kasım Cumartesi' })).toBeTruthy();
  expect(await screen.findByText('11:00–12:00')).toBeTruthy();
});

test('the arrows move one week and "Bu hafta" returns to this week', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 10, 0));
  stubFetch({
    [ME]: me,
    [WEEK]: () => ({ body: { appointments: [MON] } }),
    [NEXT_WEEK]: () => ({ body: { appointments: [] } }),
  });
  openWeekly();
  await screen.findByText('Elif Yıldız');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }));
  expect(await screen.findByRole('heading', { level: 1, name: '9 – 15 Kasım 2026' })).toBeTruthy();
  expect(await screen.findByText('Bu hafta için randevu yok')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bu hafta' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Önceki hafta' }));
  expect(await screen.findByRole('heading', { level: 1, name: '26 Ekim – 1 Kasım 2026' })).toBeTruthy();
});

test.each(['?tarih=abc', '?tarih=2026-13-45', ''])('a bad or missing date (%j) shows the current week', async (query) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 8, 0, 30)); // Pazar gece yarısından sonra
  stubFetch({ [ME]: me, [WEEK]: () => ({ body: { appointments: [MON] } }) });
  openWeekly(query);
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: '2 – 8 Kasım 2026' })).toBeTruthy();
});

test('shows a loading text', async () => {
  stubFetch({ [ME]: me, [WEEK]: () => new Promise(() => undefined) });
  openWeekly();
  expect(await screen.findByText('Hafta yükleniyor…')).toBeTruthy();
});

test('an error shows the message and "Yeniden dene" loads again', async () => {
  let calls = 0;
  stubFetch({
    [ME]: me,
    [WEEK]: () => {
      calls += 1;
      return calls === 1
        ? { status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }
        : { body: { appointments: [MON] } };
    },
  });
  openWeekly();
  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});
