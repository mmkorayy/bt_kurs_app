import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Landing } from './pages/landing/Landing';
import { Login } from './pages/login/Login';
import { PanelLayout } from './pages/panel/PanelLayout';
import { Placeholder } from './pages/panel/Placeholder';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/panel" element={<RequireAuth />}>
        <Route element={<PanelLayout />}>
          <Route index element={<Placeholder title="Günlük görünüm" />} />
          <Route path="hafta" element={<Placeholder title="Haftalık görünüm" />} />
          <Route path="ay" element={<Placeholder title="Aylık görünüm" />} />
          <Route path="danisanlar" element={<Placeholder title="Danışanlar" />} />
        </Route>
      </Route>
      <Route path="*" element={<p>Sayfa bulunamadı.</p>} />
    </Routes>
  );
}
