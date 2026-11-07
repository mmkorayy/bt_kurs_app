import { screen } from '@testing-library/react';
import { App } from '../../App';
import { DEMO_USER, renderApp, stubFetch } from '../../test-utils';

test('the top bar has the four tabs, the user name and a logout button', async () => {
  stubFetch({ 'GET /api/v1/auth/me': () => ({ body: { user: DEMO_USER } }) });
  renderApp(<App />, { route: '/panel/hafta' });

  const nav = await screen.findByRole('navigation', { name: 'Panel menüsü' });
  const links = Array.from(nav.querySelectorAll('a'));
  expect(links.map((a) => a.textContent)).toEqual(['Gün', 'Hafta', 'Ay', 'Danışanlar']);
  expect(links.map((a) => a.getAttribute('href'))).toEqual([
    '/panel',
    '/panel/hafta',
    '/panel/ay',
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
