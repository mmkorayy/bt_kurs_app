import { FORM_ENDPOINT, sendSignup, validateSignup } from './signup';

const valid = { name: 'Elif Demir', email: 'elif@example.com', profession: 'Koç' };

afterEach(() => vi.unstubAllGlobals());

test('FORM_ENDPOINT stays empty until a form service is chosen', () => {
  expect(FORM_ENDPOINT).toBe('');
});

describe('validateSignup', () => {
  test('accepts a complete form', () => {
    expect(validateSignup(valid)).toEqual({});
  });

  test('asks for a name when it is empty or only spaces', () => {
    expect(validateSignup({ ...valid, name: '' }).name).toBe('Lütfen adını ve soyadını yaz.');
    expect(validateSignup({ ...valid, name: '   ' }).name).toBe('Lütfen adını ve soyadını yaz.');
  });

  test('rejects emails without a dot after the @ or with spaces', () => {
    const message = 'Lütfen geçerli bir e-posta adresi yaz.';
    expect(validateSignup({ ...valid, email: '' }).email).toBe(message);
    expect(validateSignup({ ...valid, email: 'a@b' }).email).toBe(message);
    expect(validateSignup({ ...valid, email: 'a b@c.d' }).email).toBe(message);
  });

  test('asks for a profession', () => {
    expect(validateSignup({ ...valid, profession: '' }).profession).toBe('Lütfen mesleğini seç.');
  });
});

describe('sendSignup', () => {
  test('with an empty endpoint it fails and never calls fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendSignup(valid, '')).toEqual({ ok: false, reason: 'no_endpoint' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('posts the values as JSON and succeeds on 200', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendSignup(valid, 'https://forms.example/x')).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('https://forms.example/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid),
      signal: expect.any(AbortSignal),
    });
  });

  test('a non-OK answer is a server failure', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 500 }));
    expect(await sendSignup(valid, 'https://forms.example/x')).toEqual({ ok: false, reason: 'server' });
  });

  test('a fetch that never answers fails with "timeout" after the limit', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      );
      const result = sendSignup(valid, 'https://forms.example/x');
      await vi.advanceTimersByTimeAsync(15_000);
      expect(await result).toEqual({ ok: false, reason: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  test('a rejected fetch is a network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    expect(await sendSignup(valid, 'https://forms.example/x')).toEqual({ ok: false, reason: 'network' });
  });
});
