import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

function Harness({ open }: { open: boolean }) {
  return (
    <>
      <button>Açan</button>
      <button>Dışarıdaki</button>
      {open && (
        <Modal title="Pencere" onClose={() => undefined}>
          <button>Birinci</button>
          <button>İkinci</button>
        </Modal>
      )}
    </>
  );
}

const tab = (shiftKey = false) => fireEvent.keyDown(document, { key: 'Tab', shiftKey });

test('Tab from the last button wraps to the first, Shift+Tab from the first wraps to the last', () => {
  render(<Harness open />);
  const close = screen.getByRole('button', { name: 'Kapat' });
  const second = screen.getByRole('button', { name: 'İkinci' });
  second.focus();
  tab();
  expect(document.activeElement).toBe(close);
  close.focus();
  tab(true);
  expect(document.activeElement).toBe(second);
});

test('Shift+Tab from the dialog itself goes to the last button', () => {
  render(<Harness open />);
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  tab(true);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'İkinci' }));
});

test('Tab while focus is outside the dialog pulls it back in', () => {
  render(<Harness open />);
  screen.getByRole('button', { name: 'Dışarıdaki' }).focus();
  tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Kapat' }));
});

test('on close, focus goes back to the button that opened it', () => {
  const { rerender } = render(<Harness open={false} />);
  screen.getByRole('button', { name: 'Açan' }).focus();
  rerender(<Harness open />);
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  rerender(<Harness open={false} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Açan' }));
});

test('on close, focus is not taken back when the page already moved it elsewhere', () => {
  const { rerender } = render(<Harness open={false} />);
  screen.getByRole('button', { name: 'Açan' }).focus();
  rerender(<Harness open />);
  screen.getByRole('button', { name: 'Dışarıdaki' }).focus();
  rerender(<Harness open={false} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dışarıdaki' }));
});
