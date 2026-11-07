import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import './Login.css';

export function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/panel" replace />;

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
