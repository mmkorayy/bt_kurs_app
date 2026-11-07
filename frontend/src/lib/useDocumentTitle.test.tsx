import { render } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

function Page({ title }: { title: string }) {
  useDocumentTitle(title);
  return null;
}

test('sets the tab title and puts the plain name back when the page goes away', () => {
  const { rerender, unmount } = render(<Page title="Hafta" />);
  expect(document.title).toBe('Hafta · Bookpal');
  rerender(<Page title="Ay" />);
  expect(document.title).toBe('Ay · Bookpal');
  unmount();
  expect(document.title).toBe('Bookpal');
});
