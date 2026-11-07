import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import './Login.css';

/** RequireAuth'un bıraktığı "geldiği sayfa" yalnızca /panel altındaysa kullanılır; yoksa günlük görünüm. */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && /^\/panel(\/|\?|$)/.test(from) ? from : '/panel';
}

export function Login() {
  useDocumentTitle('Giriş');
  const location = useLocation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to={returnPath(location.state)} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      await login(email.trim(), password);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
      setSending(false);
    }
  }

  return (
    <main className="login">
      <Link className="login-logo" to="/">
        Book<span>pal</span>
      </Link>
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1>Giriş</h1>
        <div className="login-field">
          <label htmlFor="login-email">E-posta</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="login-field">
          <label htmlFor="login-password">Parola</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button className="login-submit" type="submit" disabled={sending}>
          Giriş yap
        </button>
      </form>
    </main>
  );
}
