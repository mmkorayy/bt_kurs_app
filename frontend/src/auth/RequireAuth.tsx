import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthProvider';

/** /panel altındaki sayfaları korur: oturum yoksa /giris'e yönlendirir. */
export function RequireAuth() {
  const { user, status } = useAuth();
  if (status === 'loading') return <p className="app-loading">Yükleniyor…</p>;
  if (!user) return <Navigate to="/giris" replace />;
  return <Outlet />;
}
