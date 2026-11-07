import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  /** `unavailable`: sunucuya ulaşılamadı ya da 5xx döndü (oturum durumu bilinmiyor); `errorMessage` nedenini söyler. */
  status: 'loading' | 'ready' | 'unavailable';
  errorMessage: string;
  /** Başlangıçtaki "ben kimim" isteğini yeniden dener. */
  retry(): void;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    // Herhangi bir istek 401 dönerse oturum düşmüştür: kullanıcı silinir, RequireAuth giriş sayfasına yollar.
    setUnauthorizedHandler(() => setUser(null));
    fetchMe().then(
      (me) => {
        if (!current) return;
        setUser(me);
        setStatus('ready');
      },
      (failure: unknown) => {
        // Sunucuya ulaşılamadı ya da 5xx: oturum durumu bilinmiyor; "çıkış yapılmış" gibi davranılmaz.
        if (!current) return;
        setErrorMessage(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
        setStatus('unavailable');
      },
    );
    return () => {
      current = false;
      setUnauthorizedHandler(undefined);
    };
  }, [attempt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      errorMessage,
      retry() {
        setStatus('loading');
        setAttempt((value) => value + 1);
      },
      async login(email, password) {
        setUser(await apiLogin(email, password));
      },
      async logout() {
        try {
          await apiLogout();
        } catch {
          // Çıkış isteği başarısız olsa da tarayıcıdaki oturum durumu temizlenir.
        } finally {
          setUser(null);
        }
      },
    }),
    [user, status, errorMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return value;
}
