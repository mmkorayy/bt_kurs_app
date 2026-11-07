import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from './App';

test('the home route shows the landing page', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Randevularını ve danışanlarını tek yerde takip et' })).toBeTruthy();
});

test('an unknown route says the page was not found', () => {
  render(
    <MemoryRouter initialEntries={['/yok']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText('Sayfa bulunamadı.')).toBeTruthy();
});
