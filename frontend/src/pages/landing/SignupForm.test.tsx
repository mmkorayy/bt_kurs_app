import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignupForm } from './SignupForm';

const NO_ENDPOINT = 'Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.';
const NETWORK = 'Kaydın gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.';
const SERVER = 'Kaydın şu an alınamadı. Lütfen biraz sonra tekrar dene.';
const TIMEOUT = 'Sunucu zamanında yanıt vermedi. Lütfen tekrar dene.';

/** Gerçek fetch gibi: cevap vermez, ama iptal edilince AbortError ile biter. */
function neverAnswers(init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
  });
}

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

test('a lost connection shows the connection message and re-enables the button', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('offline');
  });
  render(<SignupForm endpoint="https://forms.example/x" />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  expect(await screen.findByText(NETWORK)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(false);
});

test('a 500 answer shows a server message, not the connection message', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 500 }));
  render(<SignupForm endpoint="https://forms.example/x" />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  submit();
  expect(await screen.findByText(SERVER)).toBeTruthy();
  expect(screen.queryByText(NETWORK)).toBeNull();
  expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(false);
});

test('a server that never answers is given up on and the button works again', async () => {
  vi.useFakeTimers();
  try {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => neverAnswers(init));
    render(<SignupForm endpoint="https://forms.example/x" />);
    fill('Elif Demir', 'elif@example.com', 'Koç');
    submit();
    expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByText(TIMEOUT)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Kaydol' }) as HTMLButtonElement).disabled).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

test('each error message is linked to its field with aria-describedby', () => {
  render(<SignupForm />);
  expect(screen.getByLabelText('Ad soyad').hasAttribute('aria-describedby')).toBe(false);
  submit();
  for (const [label, message] of [
    ['Ad soyad', 'Lütfen adını ve soyadını yaz.'],
    ['E-posta', 'Lütfen geçerli bir e-posta adresi yaz.'],
    ['Meslek', 'Lütfen mesleğini seç.'],
  ]) {
    const id = screen.getByLabelText(label).getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe(message);
  }
});

test('after a successful send keyboard focus moves to the thank-you heading', async () => {
  vi.stubGlobal('fetch', async () => new Response(null, { status: 200 }));
  render(<SignupForm endpoint="https://forms.example/x" />);
  fill('Elif Demir', 'elif@example.com', 'Koç');
  screen.getByRole('button', { name: 'Kaydol' }).focus();
  submit();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Teşekkürler!')));
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
