import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

/** /panel altındaki sayfaları korur: oturum yoksa /giris'e yönlendirir. */
export function RequireAuth() {
  const { user, status, errorMessage, retry } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <p className="app-loading">Yükleniyor…</p>;
  if (status === 'unavailable') {
    return (
      <div className="app-loading">
        <p>{errorMessage}</p>
        <button type="button" onClick={retry}>
          Yeniden dene
        </button>
      </div>
    );
  }
  // Giriş sonrası kullanıcı geldiği sayfaya döner.
  if (!user) return <Navigate to="/giris" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
