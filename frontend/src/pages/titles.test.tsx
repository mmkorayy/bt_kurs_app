import { screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { App } from '../App';
import { DEMO_USER, renderApp, stubFetch } from '../test-utils';

const ME = 'GET /api/v1/auth/me';
const me = () => ({ body: { user: DEMO_USER } });
const NOT_LOGGED_IN = { status: 401, body: { error: { code: 'unauthorized', message: 'Giriş gerekli.' } } };

function stubPanel() {
  stubFetch({
    [ME]: me,
    'GET /api/v1/appointments?from=2026-11-07&to=2026-11-07': () => ({ body: { appointments: [] } }),
    'GET /api/v1/appointments?from=2026-11-02&to=2026-11-08': () => ({ body: { appointments: [] } }),
    'GET /api/v1/appointments?from=2026-11-01&to=2026-11-30': () => ({ body: { appointments: [] } }),
    'GET /api/v1/clients': () => ({ body: { clients: [] } }),
  });
}

test.each([
  ['/panel?tarih=2026-11-07', '7 Kasım Cumartesi · Bookpal'],
  ['/panel/hafta?tarih=2026-11-07', '2 – 8 Kasım 2026 · Bookpal'],
  ['/panel/ay?tarih=2026-11-07', 'Kasım 2026 · Bookpal'],
  ['/panel/randevular?tarih=2026-11-07', 'Randevular · Bookpal'],
  ['/panel/danisanlar', 'Danışanlar · Bookpal'],
])('the tab title of %s is %s', async (route, title) => {
  stubPanel();
  renderApp(<App />, { route });
  await waitFor(() => expect(document.title).toBe(title));
});

test('the login page has its own tab title', async () => {
  stubFetch({ [ME]: () => NOT_LOGGED_IN });
  renderApp(<App />, { route: '/giris' });
  await screen.findByRole('heading', { name: 'Giriş' });
  expect(document.title).toBe('Giriş · Bookpal');
});
