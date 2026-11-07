// Kayıtların gönderileceği adres. Boşken form hiçbir şey göndermez ve hata gösterir.
// Gövde JSON olarak gider; seçilecek form servisine göre biçim değişebilir.
export const FORM_ENDPOINT = '';

export interface SignupValues {
  name: string;
  email: string;
  profession: string;
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

export type SendResult = { ok: true } | { ok: false; reason: 'no_endpoint' | 'network' | 'server' | 'timeout' };

/** Sunucu bu süre içinde cevap vermezse istek bırakılır ve düğme yeniden açılır. */
export const SEND_TIMEOUT_MS = 10_000;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Lütfen adını ve soyadını yaz.';
  }
  if (!EMAIL_PATTERN.test(values.email || '')) {
    errors.email = 'Lütfen geçerli bir e-posta adresi yaz.';
  }
  if (!values.profession) {
    errors.profession = 'Lütfen mesleğini seç.';
  }
  return errors;
}

export async function sendSignup(values: SignupValues, endpoint: string = FORM_ENDPOINT): Promise<SendResult> {
  if (!endpoint) return { ok: false, reason: 'no_endpoint' };
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEND_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: 'server' };
    return { ok: true };
  } catch {
    return { ok: false, reason: timedOut ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
