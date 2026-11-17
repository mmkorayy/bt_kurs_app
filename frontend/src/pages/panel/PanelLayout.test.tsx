import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { App } from '../../App';
import { DEMO_USER, renderApp, stubFetch } from '../../test-utils';

test('the top bar has the five tabs, the user name and a logout button', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/panel/hafta' });

  const nav = await screen.findByRole('navigation', { name: 'Panel menüsü' });
  const links = Array.from(nav.querySelectorAll('a'));
  expect(links.map((a) => a.textContent)).toEqual(['Gün', 'Hafta', 'Ay', 'Randevular', 'Danışanlar']);
  expect(links.map((a) => a.getAttribute('href'))).toEqual([
    '/panel',
    '/panel/hafta',
    '/panel/ay',
    '/panel/randevular',
    '/panel/danisanlar',
  ]);
  expect(screen.getByText('Elif')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Çıkış' })).toBeTruthy();
});

test('only the current tab is marked as the current page', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/panel/hafta' });
  await screen.findByRole('navigation', { name: 'Panel menüsü' });
  expect(screen.getByRole('link', { name: 'Hafta' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Gün' }).getAttribute('aria-current')).toBeNull();
});

test('the day tab is current on /panel but not on the other panel pages', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/panel' });
  await screen.findByRole('navigation', { name: 'Panel menüsü' });
  expect(screen.getByRole('link', { name: 'Gün' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Ay' }).getAttribute('aria-current')).toBeNull();
});

describe('reminder footer', () => {
  const ME = 'GET /api/v1/auth/me';
  const SETTINGS = 'GET /api/v1/settings/reminders';
  const SENT = 'GET /api/v1/reminders/sent';
  const me = () => ({ body: { user: DEMO_USER } });
  const NOTE = {
    id: 'n1',
    userId: 'u1',
    appointmentId: 'a1',
    recipientEmail: 'elif@bookpal.demo',
    subject: 'Randevu Hatırlatması: Can Demir (10:00)',
    body: 'Seans Öncesi Hazırlık Özeti: geçen sefer sırt ağrısı konuşuldu.',
    sentAt: '2026-11-02T09:45:00.000Z',
  };

  test('shows the saved reminder time and sends a PATCH when it changes', async () => {
    const { calls } = stubFetch({
      [ME]: me,
      [SETTINGS]: () => ({ body: { reminderMinutesBefore: 30 } }),
      [SENT]: () => ({ body: { notifications: [] } }),
      'PATCH /api/v1/settings/reminders': ({ body }) => ({ body }),
    });
    renderApp(<App />, { route: '/panel/hafta' });
    const select = (await screen.findByLabelText('Hatırlatma süresi')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('30'));
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Kapalı',
      '15 dakika önce',
      '30 dakika önce',
      '60 dakika önce',
    ]);

    fireEvent.change(select, { target: { value: '15' } });
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ reminderMinutesBefore: 15 }));
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([
        { reminderMinutesBefore: 15 },
        { reminderMinutesBefore: null },
      ]),
    );
  });

  test('"Şimdi kontrol et" sends the check and lists the new e-mail with its summary', async () => {
    const { calls } = stubFetch({
      [ME]: me,
      [SETTINGS]: () => ({ body: { reminderMinutesBefore: 30 } }),
      [SENT]: () => ({ body: { notifications: [] } }),
      'POST /api/v1/reminders/check': () => ({ body: { sentCount: 1, notifications: [NOTE] } }),
    });
    renderApp(<App />, { route: '/panel/hafta' });
    fireEvent.click(await screen.findByRole('button', { name: 'Şimdi kontrol et' }));

    expect(await screen.findByText(NOTE.subject)).toBeTruthy();
    expect(screen.getByText(NOTE.body)).toBeTruthy();
    expect(screen.getByText(/elif@bookpal\.demo/)).toBeTruthy();
    expect(screen.getByText('1 hatırlatma gönderildi.')).toBeTruthy();
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/v1/reminders/check')).toBe(true);
  });

  test('a footer that cannot load stays quiet instead of breaking the page', async () => {
    stubFetch({ [ME]: me });
    renderApp(<App />, { route: '/panel/hafta' });
    const select = (await screen.findByLabelText('Hatırlatma süresi')) as HTMLSelectElement;
    expect(screen.queryByRole('alert')).toBeNull();
    // Gerçek ayar bilinmiyorsa "30" gibi yanlış bir değer gösterilmez, seçim kapalı kalır.
    await waitFor(() => expect(select.disabled).toBe(true));
    expect(within(select).getByRole('option', { name: 'Yüklenemedi' })).toBeTruthy();
    expect(select.value).not.toBe('30');
  });

  test('the result of "Şimdi kontrol et" is announced as a status message', async () => {
    stubFetch({
      [ME]: me,
      [SETTINGS]: () => ({ body: { reminderMinutesBefore: 30 } }),
      [SENT]: () => ({ body: { notifications: [] } }),
      'POST /api/v1/reminders/check': () => ({ body: { sentCount: 0, notifications: [] } }),
    });
    renderApp(<App />, { route: '/panel/hafta' });
    fireEvent.click(await screen.findByRole('button', { name: 'Şimdi kontrol et' }));
    expect((await screen.findByRole('status')).textContent).toBe('Gönderilecek hatırlatma yok.');
  });

  test('a late failure of an older change does not roll the select back over a newer one', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let patches = 0;
    stubFetch({
      [ME]: me,
      [SETTINGS]: () => ({ body: { reminderMinutesBefore: 30 } }),
      [SENT]: () => ({ body: { notifications: [] } }),
      'PATCH /api/v1/settings/reminders': async ({ body }) => {
        patches += 1;
        if (patches === 1) {
          await gate;
          return { status: 400, body: { error: { code: 'validation_error', message: 'Eski değişiklik reddedildi.' } } };
        }
        return { body };
      },
    });
    renderApp(<App />, { route: '/panel/hafta' });
    const select = (await screen.findByLabelText('Hatırlatma süresi')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('30'));
    fireEvent.change(select, { target: { value: '15' } });
    fireEvent.change(select, { target: { value: '60' } });
    await waitFor(() => expect(patches).toBe(2));
    release();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(select.value).toBe('60');
    expect(screen.queryByText('Eski değişiklik reddedildi.')).toBeNull();
  });

  test('the sent list refreshes by itself, so reminders sent by the timer show up', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let calls = 0;
      stubFetch({
        [ME]: me,
        [SETTINGS]: () => ({ body: { reminderMinutesBefore: 30 } }),
        [SENT]: () => ({ body: { notifications: ++calls === 1 ? [] : [NOTE] } }),
      });
      renderApp(<App />, { route: '/panel/hafta' });
      await screen.findByLabelText('Hatırlatma süresi');
      expect(screen.queryByText(NOTE.subject)).toBeNull();
      await vi.advanceTimersByTimeAsync(61_000);
      expect(await screen.findByText(NOTE.subject)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
