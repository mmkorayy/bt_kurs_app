import { render, screen } from '@testing-library/react';
import { Landing } from './Landing';

test('shows the main headline, the sections and the signup form', () => {
  render(<Landing />);
  expect(screen.getByRole('heading', { level: 1, name: 'Randevularını ve danışanlarını tek yerde takip et' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Danışan takibi neden bu kadar dağınık?' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Nasıl çalışır?' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Erken erişim için kaydol' })).toBeTruthy();
  expect(screen.getByLabelText('Ad soyad')).toBeTruthy();
});

test('the call-to-action jumps to the signup section', () => {
  render(<Landing />);
  const cta = screen.getByRole('link', { name: 'Erken erişim için kaydol' });
  expect(cta.getAttribute('href')).toBe('#early-access');
  expect(document.getElementById('early-access')).toBeTruthy();
});

test('the footer links point at the three sections', () => {
  render(<Landing />);
  const nav = screen.getByRole('navigation', { name: 'Sayfa bölümleri' });
  const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
  expect(hrefs).toEqual(['#problem-solution', '#how-it-works', '#early-access']);
});

test('the three-step list and the preview picture are present', () => {
  render(<Landing />);
  expect(screen.getByText('Müsait saatlerini belirle')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Bookpal uygulama önizlemesi' })).toBeTruthy();
});
