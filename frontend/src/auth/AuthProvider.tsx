import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'ready';
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    let current = true;
    // Herhangi bir istek 401 dönerse oturum düşmüştür: kullanıcı silinir, RequireAuth giriş sayfasına yollar.
    setUnauthorizedHandler(() => setUser(null));
    fetchMe()
      .catch(() => null)
      .then((me) => {
        if (!current) return;
        setUser(me);
        setStatus('ready');
      });
    return () => {
      current = false;
      setUnauthorizedHandler(undefined);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
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
    [user, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return value;
}
