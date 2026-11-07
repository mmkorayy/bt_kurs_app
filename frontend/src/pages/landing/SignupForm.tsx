import { useEffect, useRef, useState, type FormEvent } from 'react';
import './SignupForm.css';
import { FORM_ENDPOINT, sendSignup, validateSignup, type SignupErrors, type SignupValues } from './signup';

const NO_ENDPOINT_MESSAGE = 'Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.';
const NETWORK_MESSAGE = 'Kaydın gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.';
const SERVER_MESSAGE = 'Kaydın şu an alınamadı. Lütfen biraz sonra tekrar dene.';
const TIMEOUT_MESSAGE = 'Sunucu zamanında yanıt vermedi. Lütfen tekrar dene.';

const FAILURE_MESSAGES = {
  no_endpoint: NO_ENDPOINT_MESSAGE,
  network: NETWORK_MESSAGE,
  server: SERVER_MESSAGE,
  timeout: TIMEOUT_MESSAGE,
};

const FIELD_ORDER: (keyof SignupValues)[] = ['name', 'email', 'profession'];

interface SignupFormProps {
  /** Testler için; boş bırakılırsa FORM_ENDPOINT kullanılır. */
  endpoint?: string;
}

export function SignupForm({ endpoint = FORM_ENDPOINT }: SignupFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const professionRef = useRef<HTMLSelectElement>(null);
  const fieldRefs = { name: nameRef, email: emailRef, profession: professionRef };

  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const thanksRef = useRef<HTMLHeadingElement>(null);

  // Form gizlenince odaklı düğme kaybolur; klavye odağı teşekkür başlığına taşınır.
  useEffect(() => {
    if (done) thanksRef.current?.focus();
  }, [done]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError('');

    const values: SignupValues = {
      name: nameRef.current?.value.trim() ?? '',
      email: emailRef.current?.value.trim() ?? '',
      profession: professionRef.current?.value ?? '',
    };
    const found = validateSignup(values);
    const invalid = FIELD_ORDER.filter((key) => found[key]);
    if (invalid.length > 0) {
      setErrors(found);
      fieldRefs[invalid[0]].current?.focus();
      return;
    }

    setSending(true);
    const result = await sendSignup(values, endpoint);
    if (result.ok) {
      setDone(true);
      return;
    }
    setFormError(FAILURE_MESSAGES[result.reason]);
    setSending(false);
  }

  return (
    <>
      <form id="signup-form" className="landing-card" method="post" noValidate hidden={done} onSubmit={handleSubmit}>
        <div className="landing-field">
          <label htmlFor="signup-name">Ad soyad</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            ref={nameRef}
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
          />
          <p id="signup-name-error" className="landing-field-error" role="alert">
            {errors.name}
          </p>
        </div>
        <div className="landing-field">
          <label htmlFor="signup-email">E-posta</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            ref={emailRef}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
          />
          <p id="signup-email-error" className="landing-field-error" role="alert">
            {errors.email}
          </p>
        </div>
        <div className="landing-field">
          <label htmlFor="signup-profession">Meslek</label>
          <select
            id="signup-profession"
            name="profession"
            ref={professionRef}
            aria-invalid={errors.profession ? 'true' : undefined}
            aria-describedby={errors.profession ? 'signup-profession-error' : undefined}
          >
            <option value="">Mesleğini seç</option>
            <option>Koç</option>
            <option>Psikolog</option>
            <option>Psikiyatrist</option>
            <option>Danışman</option>
            <option>Diğer</option>
          </select>
          <p id="signup-profession-error" className="landing-field-error" role="alert">
            {errors.profession}
          </p>
        </div>
        <p id="signup-error" className="landing-form-error" role="alert" hidden={formError === ''}>
          {formError}
        </p>
        <button id="signup-submit" className="landing-cta" type="submit" disabled={sending}>
          Kaydol
        </button>
        <p className="landing-privacy">E-postanız yalnızca Bookpal duyuruları için kullanılacak.</p>
      </form>

      <div id="signup-success" aria-live="polite">
        <div className="landing-card" hidden={!done}>
          <h3 ref={thanksRef} tabIndex={-1}>
            Teşekkürler!
          </h3>
          <p>Kaydın bize ulaştı. Bookpal hazır olduğunda sana haber vereceğiz.</p>
        </div>
      </div>
    </>
  );
}
