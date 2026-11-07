import { fireEvent, screen } from '@testing-library/react';
import { App } from '../../App';
import { DEMO_USER, renderApp, stubFetch } from '../../test-utils';

const ME = 'GET /api/v1/auth/me';
const NOT_LOGGED_IN = { status: 401, body: { error: { code: 'unauthorized', message: 'Giriş gerekli.' } } };

function typeCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Parola'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
}

test('a wrong login shows the server message under the form and keeps the email', async () => {
  stubFetch({
    [ME]: () => NOT_LOGGED_IN,
    'POST /api/v1/auth/login': () => ({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'E-posta ya da parola hatalı.' } },
    }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByRole('heading', { name: 'Giriş' });
  typeCredentials('elif@bookpal.demo', 'yanlis');
  expect((await screen.findByRole('alert')).textContent).toBe('E-posta ya da parola hatalı.');
  expect((screen.getByLabelText('E-posta') as HTMLInputElement).value).toBe('elif@bookpal.demo');
  // Yanlış parola oturum kaybı sayılmaz: giriş sayfasında kalınır.
  expect(screen.getByRole('heading', { name: 'Giriş' })).toBeTruthy();
});

test('a correct login sends the credentials and opens the panel', async () => {
  const { calls } = stubFetch({
    [ME]: () => NOT_LOGGED_IN,
    'POST /api/v1/auth/login': () => ({ body: { token: 't', user: DEMO_USER } }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByRole('heading', { name: 'Giriş' });
  typeCredentials('elif@bookpal.demo', 'demo-elif-123');
  expect(await screen.findByRole('link', { name: 'Gün' })).toBeTruthy();
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    email: 'elif@bookpal.demo',
    password: 'demo-elif-123',
  });
});

test('a logged-in user who opens /giris is sent to the panel', async () => {
  stubFetch({ [ME]: () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/giris' });
  expect(await screen.findByRole('link', { name: 'Gün' })).toBeTruthy();
});

test('after logging in the user lands on the page they were trying to open', async () => {
  let loggedIn = false;
  stubFetch({
    [ME]: () => (loggedIn ? { body: { user: DEMO_USER } } : NOT_LOGGED_IN),
    'POST /api/v1/auth/login': () => {
      loggedIn = true;
      return { body: { token: 't', user: DEMO_USER } };
    },
    'GET /api/v1/appointments?from=2026-11-02&to=2026-11-08': () => ({ body: { appointments: [] } }),
  });
  renderApp(<App />, { route: '/panel/hafta?tarih=2026-11-04' });
  await screen.findByRole('heading', { name: 'Giriş' });
  typeCredentials('elif@bookpal.demo', 'demo-elif-123');
  expect(await screen.findByRole('heading', { level: 1, name: '2 – 8 Kasım 2026' })).toBeTruthy();
});

test('a visitor who opens /giris directly lands on the daily panel after logging in', async () => {
  let loggedIn = false;
  stubFetch({
    [ME]: () => (loggedIn ? { body: { user: DEMO_USER } } : NOT_LOGGED_IN),
    'POST /api/v1/auth/login': () => {
      loggedIn = true;
      return { body: { token: 't', user: DEMO_USER } };
    },
    [`GET /api/v1/appointments?from=${new Date().getFullYear()}`]: () => ({ body: { appointments: [] } }),
  });
  renderApp(<App />, { route: '/giris' });
  await screen.findByRole('heading', { name: 'Giriş' });
  typeCredentials('elif@bookpal.demo', 'demo-elif-123');
  await screen.findByRole('navigation', { name: 'Panel menüsü' });
});
