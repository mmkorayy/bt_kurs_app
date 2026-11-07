import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Landing } from './pages/landing/Landing';
import { Login } from './pages/login/Login';
import { ClientsPage } from './pages/panel/clients/ClientsPage';
import { DailyPage } from './pages/panel/daily/DailyPage';
import { PanelLayout } from './pages/panel/PanelLayout';
import { Placeholder } from './pages/panel/Placeholder';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/panel" element={<RequireAuth />}>
        <Route element={<PanelLayout />}>
          <Route index element={<DailyPage />} />
          <Route path="hafta" element={<Placeholder title="Haftalık görünüm" />} />
          <Route path="ay" element={<Placeholder title="Aylık görünüm" />} />
          <Route path="danisanlar" element={<ClientsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<p>Sayfa bulunamadı.</p>} />
    </Routes>
  );
}
