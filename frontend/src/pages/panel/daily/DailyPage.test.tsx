import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { App } from '../../../App';
import type { AppointmentView, Client } from '../../../api/types';
import { DEMO_USER, renderApp, stubFetch } from '../../../test-utils';

const ME = 'GET /api/v1/auth/me';
const DAY = 'GET /api/v1/appointments?from=2026-11-07&to=2026-11-07';
const NEXT_DAY = 'GET /api/v1/appointments?from=2026-11-08&to=2026-11-08';
const CLIENTS = 'GET /api/v1/clients';

const me = () => ({ body: { user: DEMO_USER } });

const ELIF = { id: 'c1', firstName: 'Elif', lastName: 'Yıldız' };
const CAN = { id: 'c2', firstName: 'Can', lastName: 'Demir' };

function appointment(over: Partial<AppointmentView> & { client: AppointmentView['client'] }): AppointmentView {
  return {
    id: 'a1',
    userId: 'u1',
    clientId: over.client.id,
    date: '2026-11-07',
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    note: '',
    ...over,
  };
}

const A1 = appointment({ client: ELIF, note: 'İlk görüşme' });
const A2 = appointment({ id: 'a2', client: CAN, startTime: '14:00', endTime: '15:00', status: 'cancelled', note: 'Ertelendi' });

const clientRecord = (c: { id: string; firstName: string; lastName: string }): Client => ({
  ...c,
  userId: 'u1',
  birthDate: '1990-01-01',
  gender: 'female',
  deletedAt: null,
});

function openDaily(query = '?tarih=2026-11-07') {
  renderApp(<App />, { route: `/panel${query}` });
}

afterEach(() => vi.useRealTimers());

test('asks for that one day and lists the appointments with time, client, status and note', async () => {
  const { calls } = stubFetch({ [ME]: me, [DAY]: () => ({ body: { appointments: [A1, A2] } }) });
  openDaily();
  expect(await screen.findByText('09:00–10:00')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: '7 Kasım Cumartesi' })).toBeTruthy();
  const row = screen.getByText('Elif Yıldız').closest('li')!;
  expect(within(row).getByText('Planlandı')).toBeTruthy();
  expect(within(row).getByText('İlk görüşme')).toBeTruthy();
  const second = screen.getByText('Can Demir').closest('li')!;
  expect(within(second).getByText('14:00–15:00')).toBeTruthy();
  expect(within(second).getByText('İptal')).toBeTruthy();
  const times = screen.getAllByText(/^\d\d:\d\d–\d\d:\d\d$/).map((e) => e.textContent);
  expect(times).toEqual(['09:00–10:00', '14:00–15:00']);
  expect(calls.filter((c) => c.url.startsWith('/api/v1/appointments'))).toHaveLength(1);
});

test('the arrows move one day and ask for that day', async () => {
  stubFetch({
    [ME]: me,
    [DAY]: () => ({ body: { appointments: [A1] } }),
    [NEXT_DAY]: () => ({ body: { appointments: [] } }),
  });
  openDaily();
  await screen.findByText('Elif Yıldız');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki gün' }));
  expect(await screen.findByRole('heading', { level: 1, name: '8 Kasım Pazar' })).toBeTruthy();
  expect(await screen.findByText('Bu gün için randevu yok')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Önceki gün' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});

test('"Bugün" goes back to today', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 10, 0));
  stubFetch({
    [ME]: me,
    [DAY]: () => ({ body: { appointments: [A1] } }),
    [NEXT_DAY]: () => ({ body: { appointments: [] } }),
  });
  openDaily('?tarih=2026-11-08');
  await screen.findByText('Bu gün için randevu yok');
  fireEvent.click(screen.getByRole('button', { name: 'Bugün' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});

test.each(['?tarih=abc', '?tarih=2026-13-45', '?tarih=', '', '?tarih=0226-11-07', '?tarih=9999-12-31'])('a bad or missing date (%j) falls back to today', async (query) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 7, 0, 30));
  stubFetch({ [ME]: me, [DAY]: () => ({ body: { appointments: [A1] } }) });
  openDaily(query);
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: '7 Kasım Cumartesi' })).toBeTruthy();
});

test('while the next day is loading, the old day is not shown under the new date', async () => {
  stubFetch({
    [ME]: me,
    [DAY]: () => ({ body: { appointments: [A1] } }),
    [NEXT_DAY]: () => new Promise(() => undefined),
  });
  openDaily();
  await screen.findByText('Elif Yıldız');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki gün' }));
  expect(await screen.findByText('Randevular yükleniyor…')).toBeTruthy();
  expect(screen.getByRole('heading', { level: 1, name: '8 Kasım Pazar' })).toBeTruthy();
  expect(screen.queryByText('Elif Yıldız')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Düzenle: Elif Yıldız' })).toBeNull();
});

test('shows a loading text', async () => {
  stubFetch({ [ME]: me, [DAY]: () => new Promise(() => undefined) });
  openDaily();
  expect(await screen.findByText('Randevular yükleniyor…')).toBeTruthy();
});

test('an error shows the message and "Yeniden dene" loads again', async () => {
  let calls = 0;
  stubFetch({
    [ME]: me,
    [DAY]: () => {
      calls += 1;
      return calls === 1
        ? { status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }
        : { body: { appointments: [A1] } };
    },
  });
  openDaily();
  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});

describe('adding an appointment', () => {
  test('the form has the six fields; a 409 keeps it open with the message and the typed values; a fix saves and reloads', async () => {
    let posts = 0;
    let lists = 0;
    const created = appointment({ id: 'a3', client: CAN, startTime: '11:00', endTime: '12:00', note: 'Yeni' });
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => {
        lists += 1;
        return { body: { appointments: lists === 1 ? [A1] : [A1, created] } };
      },
      [CLIENTS]: () => ({ body: { clients: [clientRecord(ELIF), clientRecord(CAN)] } }),
      'POST /api/v1/appointments': () => {
        posts += 1;
        return posts === 1
          ? { status: 409, body: { error: { code: 'conflict', message: 'Bu saat aralığında başka bir randevunuz var.' } } }
          : { status: 201, body: { appointment: created } };
      },
    });
    openDaily();
    await screen.findByText('Elif Yıldız');

    fireEvent.click(screen.getByRole('button', { name: 'Randevu ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Randevu ekle' });
    for (const label of ['Danışan', 'Tarih', 'Başlangıç', 'Bitiş', 'Durum', 'Not']) {
      expect(within(dialog).getByLabelText(label)).toBeTruthy();
    }
    expect((within(dialog).getByLabelText('Tarih') as HTMLInputElement).value).toBe('2026-11-07');
    expect((within(dialog).getByLabelText('Bitiş') as HTMLInputElement).value).toBe('');

    await within(dialog).findByRole('option', { name: 'Can Demir' });
    fireEvent.change(within(dialog).getByLabelText('Danışan'), { target: { value: 'c2' } });
    fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '09:30' } });
    fireEvent.change(within(dialog).getByLabelText('Bitiş'), { target: { value: '10:30' } });
    fireEvent.change(within(dialog).getByLabelText('Not'), { target: { value: 'Yeni' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe('Bu saat aralığında başka bir randevunuz var.');
    expect(screen.getByRole('dialog', { name: 'Randevu ekle' })).toBeTruthy();
    expect((within(dialog).getByLabelText('Başlangıç') as HTMLInputElement).value).toBe('09:30');
    expect((within(dialog).getByLabelText('Not') as HTMLTextAreaElement).value).toBe('Yeni');
    expect((within(dialog).getByLabelText('Danışan') as HTMLSelectElement).value).toBe('c2');

    fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '11:00' } });
    fireEvent.change(within(dialog).getByLabelText('Bitiş'), { target: { value: '12:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('11:00–12:00')).toBeTruthy();
    expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
      clientId: 'c2',
      date: '2026-11-07',
      startTime: '11:00',
      endTime: '12:00',
      status: 'scheduled',
      note: 'Yeni',
    });
  });
});

describe('the client picker in the form', () => {
  test('a failed client list shows its message and "Yeniden dene" loads it again', async () => {
    let calls = 0;
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [] } }),
      [CLIENTS]: () => {
        calls += 1;
        return calls === 1
          ? { status: 500, body: { error: { code: 'server_error', message: 'Danışan listesi yüklenemedi.' } } }
          : { body: { clients: [clientRecord(CAN)] } };
      },
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Randevu ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Randevu ekle' });
    expect(await within(dialog).findByText('Danışan listesi yüklenemedi.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yeniden dene' }));
    expect(await within(dialog).findByRole('option', { name: 'Can Demir' })).toBeTruthy();
    expect(within(dialog).queryByText('Danışan listesi yüklenemedi.')).toBeNull();
  });

  test('with no clients at all the form points to the Danışanlar tab', async () => {
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [] } }),
      [CLIENTS]: () => ({ body: { clients: [] } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Randevu ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Randevu ekle' });
    expect(await within(dialog).findByText(/Danışanlar sekmesinden/)).toBeTruthy();
  });

  test('editing an appointment of a deleted client does not show the "no clients" hint', async () => {
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [A1] } }),
      [CLIENTS]: () => ({ body: { clients: [] } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Düzenle: Elif Yıldız' }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByRole('option', { name: 'Elif Yıldız (silinmiş)' });
    expect(within(dialog).queryByText(/Danışanlar sekmesinden/)).toBeNull();
  });
});

describe('changing an appointment', () => {
  test('editing opens the filled form and sends a PATCH', async () => {
    let lists = 0;
    const moved = { ...A1, startTime: '09:30' };
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => {
        lists += 1;
        return { body: { appointments: [lists === 1 ? A1 : moved] } };
      },
      [CLIENTS]: () => ({ body: { clients: [clientRecord(ELIF)] } }),
      'PATCH /api/v1/appointments/a1': () => ({ body: { appointment: moved } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Düzenle: Elif Yıldız' }));
    const dialog = screen.getByRole('dialog', { name: 'Randevuyu düzenle' });
    expect((within(dialog).getByLabelText('Başlangıç') as HTMLInputElement).value).toBe('09:00');
    expect((within(dialog).getByLabelText('Not') as HTMLTextAreaElement).value).toBe('İlk görüşme');
    fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '09:30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    expect(await screen.findByText('09:30–10:00')).toBeTruthy();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ startTime: '09:30', endTime: '10:00' });
  });

  test('editing an appointment of a deleted client lists that client as "(silinmiş)" and keeps it selected', async () => {
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [A1] } }),
      [CLIENTS]: () => ({ body: { clients: [clientRecord(CAN)] } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Düzenle: Elif Yıldız' }));
    const dialog = screen.getByRole('dialog');
    const option = await within(dialog).findByRole('option', { name: 'Elif Yıldız (silinmiş)' });
    const select = within(dialog).getByLabelText('Danışan') as HTMLSelectElement;
    expect(select.selectedOptions[0]).toBe(option);
    expect(select.value).toBe('c1');
  });

  test('cancelling sets the status to cancelled and reloads', async () => {
    let lists = 0;
    const cancelled = { ...A1, status: 'cancelled' as const };
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => {
        lists += 1;
        return { body: { appointments: [lists === 1 ? A1 : cancelled] } };
      },
      'PATCH /api/v1/appointments/a1': () => ({ body: { appointment: cancelled } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'İptal et: Elif Yıldız' }));
    expect(await screen.findByText('İptal')).toBeTruthy();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ status: 'cancelled' });
    expect(screen.queryByRole('button', { name: 'İptal et: Elif Yıldız' })).toBeNull();
  });

  test('deleting asks in an in-page dialog (never window.confirm), then deletes and reloads', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    let lists = 0;
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => {
        lists += 1;
        return { body: { appointments: lists === 1 ? [A1] : [] } };
      },
      'DELETE /api/v1/appointments/a1': () => ({ status: 204 }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
    const dialog = screen.getByRole('dialog');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }));
    expect(await screen.findByText('Bu gün için randevu yok')).toBeTruthy();
    expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/v1/appointments/a1')).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe('dialogs, focus and busy states', () => {
  test('after a delete, keyboard focus moves to the page heading', async () => {
    let lists = 0;
    stubFetch({
      [ME]: me,
      [DAY]: () => {
        lists += 1;
        return { body: { appointments: lists === 1 ? [A1] : [] } };
      },
      'DELETE /api/v1/appointments/a1': () => ({ status: 204 }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
    expect(await screen.findByText('Bu gün için randevu yok')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  test('while a delete is on its way the dialog cannot be dismissed', async () => {
    let release!: () => void;
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [A1] } }),
      'DELETE /api/v1/appointments/a1': () => new Promise((resolve) => (release = () => resolve({ status: 204 }))),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kapat' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect((within(dialog).getByRole('button', { name: 'Vazgeç' }) as HTMLButtonElement).disabled).toBe(true);
    release();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('while an appointment is being saved the form cannot be closed', async () => {
    let release!: () => void;
    const created = appointment({ id: 'a3', client: CAN, startTime: '11:00', endTime: '12:00' });
    const { calls } = stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [] } }),
      [CLIENTS]: () => ({ body: { clients: [clientRecord(CAN)] } }),
      'POST /api/v1/appointments': () =>
        new Promise((resolve) => (release = () => resolve({ status: 201, body: { appointment: created } }))),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Randevu ekle' }));
    const dialog = screen.getByRole('dialog', { name: 'Randevu ekle' });
    await within(dialog).findByRole('option', { name: 'Can Demir' });
    fireEvent.change(within(dialog).getByLabelText('Danışan'), { target: { value: 'c2' } });
    fireEvent.change(within(dialog).getByLabelText('Başlangıç'), { target: { value: '11:00' } });
    fireEvent.change(within(dialog).getByLabelText('Bitiş'), { target: { value: '12:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kapat' }));
    expect(screen.getByRole('dialog', { name: 'Randevu ekle' })).toBeTruthy();
    expect((within(dialog).getByRole('button', { name: 'Vazgeç' }) as HTMLButtonElement).disabled).toBe(true);
    release();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('"İptal et" is disabled while it works', async () => {
    let release!: () => void;
    const cancelled = { ...A1, status: 'cancelled' as const };
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [A1] } }),
      'PATCH /api/v1/appointments/a1': () => new Promise((resolve) => (release = () => resolve({ body: { appointment: cancelled } }))),
    });
    openDaily();
    const button = (await screen.findByRole('button', { name: 'İptal et: Elif Yıldız' })) as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => expect(button.disabled).toBe(true));
    release();
  });

  test('a failed cancel shows its message, and changing the day clears it', async () => {
    stubFetch({
      [ME]: me,
      [DAY]: () => ({ body: { appointments: [A1] } }),
      [NEXT_DAY]: () => ({ body: { appointments: [] } }),
      'PATCH /api/v1/appointments/a1': () => ({ status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }),
    });
    openDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'İptal et: Elif Yıldız' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Sunucu hatası.');
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki gün' }));
    await screen.findByText('Bu gün için randevu yok');
    expect(screen.queryByText('Sunucu hatası.')).toBeNull();
  });
});
