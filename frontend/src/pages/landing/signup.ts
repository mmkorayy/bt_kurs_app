// Kayıtların gönderileceği adres. Boşken form hiçbir şey göndermez ve hata gösterir.
// Gövde JSON olarak gider; seçilecek form servisine göre biçim değişebilir.
export const FORM_ENDPOINT = '';

export interface SignupValues {
  name: string;
  email: string;
  profession: string;
}

export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

export type SendResult = { ok: true } | { ok: false; reason: 'no_endpoint' | 'network' };

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
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) return { ok: false, reason: 'network' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
