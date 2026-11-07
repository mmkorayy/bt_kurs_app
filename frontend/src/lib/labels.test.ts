import { formatShortDate, genderLabel, statusLabel } from './labels';

test('gender labels', () => {
  expect(genderLabel('female')).toBe('Kadın');
  expect(genderLabel('male')).toBe('Erkek');
  expect(genderLabel('other')).toBe('Diğer');
  expect(genderLabel('undisclosed')).toBe('Belirtmek istemiyorum');
});

test('status labels', () => {
  expect(statusLabel('scheduled')).toBe('Planlandı');
  expect(statusLabel('completed')).toBe('Tamamlandı');
  expect(statusLabel('cancelled')).toBe('İptal');
});

test('formatShortDate turns YYYY-MM-DD into DD.MM.YYYY without touching time zones', () => {
  expect(formatShortDate('1990-05-17')).toBe('17.05.1990');
  expect(formatShortDate('2026-01-01')).toBe('01.01.2026');
});
