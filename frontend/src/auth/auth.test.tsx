import { act, fireEvent, screen } from '@testing-library/react';
import { request } from '../api/client';
import { App } from '../App';
import { DEMO_USER, renderApp, stubFetch } from '../test-utils';

const ME = 'GET /api/v1/auth/me';
const NOT_LOGGED_IN = { status: 401, body: { error: { code: 'unauthorized', message: 'Giriş gerekli.' } } };

test('opening /panel without a session lands on the login page', async () => {
  stubFetch({ [ME]: () => NOT_LOGGED_IN });
  renderApp(<App />, { route: '/panel' });
  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
});

test('opening /panel with a session shows the panel', async () => {
  stubFetch({ [ME]: () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/panel' });
  expect(await screen.findByRole('link', { name: 'Gün' })).toBeTruthy();
});

test('a 401 later in the session goes to the login page once, with no loop', async () => {
  const { calls } = stubFetch({
    [ME]: () => ({ body: { user: DEMO_USER } }),
    'GET /api/v1/clients': () => NOT_LOGGED_IN,
  });
  renderApp(<App />, { route: '/panel' });
  await screen.findByRole('link', { name: 'Gün' });

  await act(async () => {
    await request('/clients').catch(() => undefined);
  });

  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
  expect(calls.filter((c) => c.url === '/api/v1/auth/me')).toHaveLength(1);
  expect(calls.filter((c) => c.url === '/api/v1/clients')).toHaveLength(1);
});

test('logout calls the API and returns to the login page', async () => {
  const { calls } = stubFetch({
    [ME]: () => ({ body: { user: DEMO_USER } }),
    'POST /api/v1/auth/logout': () => ({ status: 204 }),
  });
  renderApp(<App />, { route: '/panel' });
  fireEvent.click(await screen.findByRole('button', { name: 'Çıkış' }));
  expect(await screen.findByRole('heading', { name: 'Giriş' })).toBeTruthy();
  expect(calls.some((c) => c.method === 'POST' && c.url === '/api/v1/auth/logout')).toBe(true);
});
