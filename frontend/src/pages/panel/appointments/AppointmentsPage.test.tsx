import { fireEvent, screen, within } from '@testing-library/react';
import { App } from '../../../App';
import type { AppointmentView } from '../../../api/types';
import { DEMO_USER, renderApp, stubFetch } from '../../../test-utils';

const ME = 'GET /api/v1/auth/me';
const WEEK = 'GET /api/v1/appointments?from=2026-11-02&to=2026-11-08';
const NEXT_WEEK = 'GET /api/v1/appointments?from=2026-11-09&to=2026-11-15';

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

const MON_EARLY = appointment({
  id: 'a1',
  date: '2026-11-02',
  startTime: '09:00',
  endTime: '10:00',
  client: { id: 'c1', firstName: 'Elif', lastName: 'Yıldız' },
});

const MON_LATE = appointment({
  id: 'a2',
  date: '2026-11-02',
  startTime: '14:00',
  endTime: '15:00',
  client: { id: 'c2', firstName: 'Ahmet', lastName: 'Kaya' },
});

const SAT_TODAY = appointment({
  id: 'a3',
  date: '2026-11-07',
  startTime: '11:00',
  endTime: '12:00',
  client: { id: 'c3', firstName: 'Can', lastName: 'Demir' },
});

const SAT_CANCELLED = appointment({
  id: 'a4',
  date: '2026-11-07',
  startTime: '15:00',
  endTime: '16:00',
  status: 'cancelled',
  client: { id: 'c4', firstName: 'Selin', lastName: 'Kaya' },
});

function openAppointments(query = '?tarih=2026-11-07') {
  renderApp(<App />, { route: `/panel/randevular${query}` });
}

afterEach(() => vi.useRealTimers());

test('asks once for Monday to Sunday and sorts appointments by date and start time', async () => {
  // Karışık sırada gönderiyoruz
  const { calls } = stubFetch({
    [ME]: me,
    [WEEK]: () => ({ body: { appointments: [SAT_CANCELLED, MON_LATE, SAT_TODAY, MON_EARLY] } }),
  });
  openAppointments();

  expect(await screen.findByRole('heading', { level: 1, name: '2 – 8 Kasım 2026' })).toBeTruthy();
  await screen.findByText('Can Demir');

  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(4);

  // Sıralı: MON_EARLY (09:00), MON_LATE (14:00), SAT_TODAY (11:00), SAT_CANCELLED (15:00)
  expect(within(items[0]).getByText('Elif Yıldız')).toBeTruthy();
  expect(within(items[0]).getByText('09:00–10:00')).toBeTruthy();

  expect(within(items[1]).getByText('Ahmet Kaya')).toBeTruthy();
  expect(within(items[1]).getByText('14:00–15:00')).toBeTruthy();

  expect(within(items[2]).getByText('Can Demir')).toBeTruthy();
  expect(within(items[2]).getByText('11:00–12:00')).toBeTruthy();

  expect(within(items[3]).getByText('Selin Kaya')).toBeTruthy();
  expect(within(items[3]).getByText('15:00–16:00')).toBeTruthy();

  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments'))).toHaveLength(1);
});

test('highlights today with a badge and css class, and shows cancel badge for cancelled', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 10, 0)); // 7 Kasım Cumartesi = Bugün

  stubFetch({
    [ME]: me,
    [WEEK]: () => ({ body: { appointments: [MON_EARLY, SAT_TODAY, SAT_CANCELLED] } }),
  });
  openAppointments('?tarih=2026-11-07');

  await screen.findByText('Can Demir');

  const monItem = screen.getByText('Elif Yıldız').closest('li')!;
  expect(monItem.className).not.toContain('appointments-item-today');
  expect(within(monItem).queryByText('Bugün')).toBeNull();

  const todayItem = screen.getByText('Can Demir').closest('li')!;
  expect(todayItem.className).toContain('appointments-item-today');
  expect(within(todayItem).getByText('Bugün')).toBeTruthy();

  const cancelledItem = screen.getByText('Selin Kaya').closest('li')!;
  expect(cancelledItem.className).toContain('appointments-item-off');
  expect(within(cancelledItem).getByText('İptal')).toBeTruthy();
});

test('the arrows move one week and "Bu hafta" returns to this week', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 10, 0));

  stubFetch({
    [ME]: me,
    [WEEK]: () => ({ body: { appointments: [MON_EARLY] } }),
    [NEXT_WEEK]: () => ({ body: { appointments: [] } }),
  });
  openAppointments();

  await screen.findByText('Elif Yıldız');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki hafta' }));
  expect(await screen.findByRole('heading', { level: 1, name: '9 – 15 Kasım 2026' })).toBeTruthy();
  expect(await screen.findByText('Bu hafta için randevu yok')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Bu hafta' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: '2 – 8 Kasım 2026' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Önceki hafta' }));
  expect(await screen.findByRole('heading', { level: 1, name: '26 Ekim – 1 Kasım 2026' })).toBeTruthy();
});

test('shows empty state when no appointments exist in the week', async () => {
  stubFetch({ [ME]: me, [WEEK]: () => ({ body: { appointments: [] } }) });
  openAppointments();
  expect(await screen.findByText('Bu hafta için randevu yok')).toBeTruthy();
});

test('shows loading indicator while fetching', async () => {
  stubFetch({ [ME]: me, [WEEK]: () => new Promise(() => undefined) });
  openAppointments();
  expect(await screen.findByText('Randevular yükleniyor…')).toBeTruthy();
});

test('shows error message and retry button on failure', async () => {
  let calls = 0;
  stubFetch({
    [ME]: me,
    [WEEK]: () => {
      calls += 1;
      return calls === 1
        ? { status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }
        : { body: { appointments: [MON_EARLY] } };
    },
  });
  openAppointments();
  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});
