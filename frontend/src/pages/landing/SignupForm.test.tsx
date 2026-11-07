import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignupForm } from './SignupForm';

const NO_ENDPOINT = 'Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.';
const NETWORK = 'Kaydın gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.';

afterEach(() => vi.unstubAllGlobals());

function fill(name: string, email: string, profession: string) {
  fireEvent.change(screen.getByLabelText('Ad soyad'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Meslek'), { target: { value: profession } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
}

test('an empty submit shows all three errors, marks the fields and focuses the first one', () => {
  render(<SignupForm />);
  submit();
  expect(screen.getByText('Lütfen adını ve soyadını yaz.')).toBeTruthy();
  expect(screen.getByText('Lütfen geçerli bir e-posta adresi yaz.')).toBeTruthy();
  expect(screen.getByText('Lütfen mesleğini seç.')).toBeTruthy();
  expect(screen.getByLabelText('Ad soyad').getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(screen.getByLabelText('Ad soyad'));
});

test('with the empty FORM_ENDPOINT it shows the error and never the thank-you', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<SignupForm />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  expect(await screen.findByText(NO_ENDPOINT)).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText('Teşekkürler!').closest('.landing-card')?.hasAttribute('hidden')).toBe(true);
  expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(false);
});

test('a successful send hides the form and shows the thank-you', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 200 }));
  render(<SignupForm endpoint="https://forms.example/x" />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  await waitFor(() =>
    expect(screen.getByText('Teşekkürler!').closest('.landing-card')?.hasAttribute('hidden')).toBe(false),
  );
  expect(document.getElementById('signup-form')?.hasAttribute('hidden')).toBe(true);
});

test('a failed send shows the connection message and re-enables the button', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 500 }));
  render(<SignupForm endpoint="https://forms.example/x" />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  expect(await screen.findByText(NETWORK)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(false);
});

test('fixing the fields and submitting again clears the old errors', async () => {
  render(<SignupForm />);
  submit();
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  expect(await screen.findByText(NO_ENDPOINT)).toBeTruthy();
  expect(screen.queryByText('Lütfen mesleğini seç.')).toBeNull();
  expect(screen.getByLabelText('Ad soyad').hasAttribute('aria-invalid')).toBe(false);
});
