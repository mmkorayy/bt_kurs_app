import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { App } from '../../../App';
import type { Client } from '../../../api/types';
import { DEMO_USER, renderApp, stubFetch } from '../../../test-utils';

const ME = 'GET /api/v1/auth/me';
const LIST = 'GET /api/v1/clients';

const ELIF: Client = {
  id: 'c1',
  userId: 'u1',
  firstName: 'Elif',
  lastName: 'Yıldız',
  birthDate: '1990-05-17',
  gender: 'female',
  deletedAt: null,
};
const CAN: Client = { ...ELIF, id: 'c2', firstName: 'Can', lastName: 'Demir', birthDate: '1985-02-03', gender: 'male' };

const me = () => ({ body: { user: DEMO_USER } });

function openClients() {
  renderApp(<App />, { route: '/panel/danisanlar' });
}

function fillForm(values: { first?: string; last?: string; birth?: string; gender?: string }) {
  const dialog = screen.getByRole('dialog');
  const set = (label: string, value?: string) => {
    if (value !== undefined) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
  };
  set('Ad', values.first);
  set('Soyad', values.last);
  set('Doğum tarihi', values.birth);
  set('Cinsiyet', values.gender);
}

test('shows a loading text while the list is on its way', async () => {
  stubFetch({ [ME]: me, [LIST]: () => new Promise(() => undefined) });
  openClients();
  expect(await screen.findByText('Danışanlar yükleniyor…')).toBeTruthy();
});

test('shows the empty text when there are no clients', async () => {
  stubFetch({ [ME]: me, [LIST]: () => ({ body: { clients: [] } }) });
  openClients();
  expect(await screen.findByText('Henüz danışan yok')).toBeTruthy();
});

test('an error shows the message and "Yeniden dene" loads the list again', async () => {
  let calls = 0;
  stubFetch({
    [ME]: me,
    [LIST]: () => {
      calls += 1;
      return calls === 1
        ? { status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } }
        : { body: { clients: [ELIF] } };
    },
  });
  openClients();
  expect(await screen.findByText('Sunucu hatası.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByText('Elif Yıldız')).toBeTruthy();
});

test('lists each client with birth date and gender', async () => {
  stubFetch({ [ME]: me, [LIST]: () => ({ body: { clients: [CAN, ELIF] } }) });
  openClients();
  const row = (await screen.findByText('Elif Yıldız')).closest('li')!;
  expect(within(row).getByText('17.05.1990')).toBeTruthy();
  expect(within(row).getByText('Kadın')).toBeTruthy();
  expect(screen.getByText('Can Demir')).toBeTruthy();
});

test('typing in the search box asks the API with the encoded text after a short pause', async () => {
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => ({ body: { clients: [ELIF] } }),
    'GET /api/v1/clients?search=%C4%B0%20%C5%9F': () => ({ body: { clients: [] } }),
  });
  openClients();
  await screen.findByText('Elif Yıldız');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  fireEvent.change(screen.getByLabelText('Danışan ara'), { target: { value: 'İ ş' } });
  expect(calls.filter((c) => c.url.includes('search'))).toHaveLength(0);
  act(() => {
    vi.advanceTimersByTime(400);
  });
  vi.useRealTimers();
  expect(await screen.findByText('Aramaya uygun danışan bulunamadı.')).toBeTruthy();
  expect(calls.filter((c) => c.url.includes('search'))).toHaveLength(1);
});

test('adding a client: a 400 keeps the pop-up open with the message and the typed values, then a fix saves and reloads', async () => {
  let posts = 0;
  let lists = 0;
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => {
      lists += 1;
      return { body: { clients: lists === 1 ? [ELIF] : [ELIF, CAN] } };
    },
    'POST /api/v1/clients': () => {
      posts += 1;
      return posts === 1
        ? { status: 400, body: { error: { code: 'validation_error', message: 'Doğum tarihi gelecekte olamaz.' } } }
        : { status: 201, body: { client: CAN } };
    },
  });
  openClients();
  await screen.findByText('Elif Yıldız');

  fireEvent.click(screen.getByRole('button', { name: 'Danışan ekle' }));
  const dialog = screen.getByRole('dialog', { name: 'Danışan ekle' });
  fillForm({ first: 'Can', last: 'Demir', birth: '2999-01-01', gender: 'male' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

  expect((await within(dialog).findByRole('alert')).textContent).toBe('Doğum tarihi gelecekte olamaz.');
  expect((within(dialog).getByLabelText('Ad') as HTMLInputElement).value).toBe('Can');
  expect((within(dialog).getByLabelText('Doğum tarihi') as HTMLInputElement).value).toBe('2999-01-01');

  fillForm({ birth: '1985-02-03' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('Can Demir')).toBeTruthy();
  expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
    firstName: 'Can',
    lastName: 'Demir',
    birthDate: '1985-02-03',
    gender: 'male',
  });
});

test('editing a client opens the form filled in and sends a PATCH', async () => {
  let lists = 0;
  const renamed = { ...ELIF, firstName: 'Elife' };
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => {
      lists += 1;
      return { body: { clients: [lists === 1 ? ELIF : renamed] } };
    },
    'PATCH /api/v1/clients/c1': () => ({ body: { client: renamed } }),
  });
  openClients();
  fireEvent.click(await screen.findByRole('button', { name: 'Düzenle: Elif Yıldız' }));
  const dialog = screen.getByRole('dialog', { name: 'Danışanı düzenle' });
  expect((within(dialog).getByLabelText('Ad') as HTMLInputElement).value).toBe('Elif');
  expect((within(dialog).getByLabelText('Cinsiyet') as HTMLSelectElement).value).toBe('female');
  fillForm({ first: 'Elife' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('Elife Yıldız')).toBeTruthy();
  expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ firstName: 'Elife', lastName: 'Yıldız' });
});

test('deleting asks in an in-page dialog (never window.confirm), then deletes and reloads', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm');
  let lists = 0;
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => {
      lists += 1;
      return { body: { clients: lists === 1 ? [ELIF] : [] } };
    },
    'DELETE /api/v1/clients/c1': () => ({ status: 204 }),
  });
  openClients();
  fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/Elif Yıldız/)).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }));
  expect(await screen.findByText('Henüz danışan yok')).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/v1/clients/c1')).toBe(true);
  expect(confirmSpy).not.toHaveBeenCalled();
});

test('Escape closes the pop-up and focus goes back to the button that opened it', async () => {
  stubFetch({ [ME]: me, [LIST]: () => ({ body: { clients: [] } }) });
  openClients();
  const opener = await screen.findByRole('button', { name: 'Danışan ekle' });
  opener.focus();
  fireEvent.click(opener);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(opener);
});

test('after a delete, keyboard focus moves to the page heading', async () => {
  let lists = 0;
  stubFetch({
    [ME]: me,
    [LIST]: () => {
      lists += 1;
      return { body: { clients: lists === 1 ? [ELIF] : [] } };
    },
    'DELETE /api/v1/clients/c1': () => ({ status: 204 }),
  });
  openClients();
  fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }));
  expect(await screen.findByText('Henüz danışan yok')).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
});

test('while a client is being saved the form cannot be closed', async () => {
  let release!: () => void;
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => ({ body: { clients: [] } }),
    'POST /api/v1/clients': () => new Promise((resolve) => (release = () => resolve({ status: 201, body: { client: ELIF } }))),
  });
  openClients();
  fireEvent.click(await screen.findByRole('button', { name: 'Danışan ekle' }));
  fillForm({ first: 'Elif', last: 'Yıldız', birth: '1990-05-17', gender: 'female' });
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Kapat' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((within(dialog).getByRole('button', { name: 'Vazgeç' }) as HTMLButtonElement).disabled).toBe(true);
  release();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('while a delete is on its way the dialog cannot be dismissed', async () => {
  let release!: () => void;
  const { calls } = stubFetch({
    [ME]: me,
    [LIST]: () => ({ body: { clients: [ELIF] } }),
    'DELETE /api/v1/clients/c1': () => new Promise((resolve) => (release = () => resolve({ status: 204 }))),
  });
  openClients();
  fireEvent.click(await screen.findByRole('button', { name: 'Sil: Elif Yıldız' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Sil' }));
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect((within(dialog).getByRole('button', { name: 'Vazgeç' }) as HTMLButtonElement).disabled).toBe(true);
  release();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
