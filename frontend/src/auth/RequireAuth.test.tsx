import { fireEvent, screen } from '@testing-library/react';
import { App } from '../App';
import { DEMO_USER, renderApp, stubFetch } from '../test-utils';

const ME = 'GET /api/v1/auth/me';
const DAY = 'GET /api/v1/appointments?from=2026-11-07&to=2026-11-07';

test.each([
  ['the server cannot be reached', () => { throw new Error('offline'); }],
  ['the server answers 500', () => ({ status: 500, body: { error: { code: 'server_error', message: 'Sunucu hatası.' } } })],
])('when %s at start-up the panel says so and offers a retry, instead of acting logged out', async (_name, failing) => {
  let calls = 0;
  stubFetch({
    [ME]: () => {
      calls += 1;
      return calls === 1 ? (failing as () => never)() : { body: { user: DEMO_USER } };
    },
    [DAY]: () => ({ body: { appointments: [] } }),
  });
  renderApp(<App />, { route: '/panel?tarih=2026-11-07' });
  expect(await screen.findByText(/Sunucuya ulaşılamadı|Sunucu hatası/)).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Giriş' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
  expect(await screen.findByRole('heading', { level: 1, name: '7 Kasım Cumartesi' })).toBeTruthy();
});
