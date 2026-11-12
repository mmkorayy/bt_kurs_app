import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Landing } from './pages/landing/Landing';
import { Login } from './pages/login/Login';
import { ClientsPage } from './pages/panel/clients/ClientsPage';
import { DailyPage } from './pages/panel/daily/DailyPage';
import { MonthlyPage } from './pages/panel/monthly/MonthlyPage';
import { AppointmentsPage } from './pages/panel/appointments/AppointmentsPage';
import { PanelLayout } from './pages/panel/PanelLayout';
import { WeeklyPage } from './pages/panel/weekly/WeeklyPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/panel" element={<RequireAuth />}>
        <Route element={<PanelLayout />}>
          <Route index element={<DailyPage />} />
          <Route path="hafta" element={<WeeklyPage />} />
          <Route path="ay" element={<MonthlyPage />} />
          <Route path="randevular" element={<AppointmentsPage />} />
          <Route path="danisanlar" element={<ClientsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<p>Sayfa bulunamadı.</p>} />
    </Routes>
  );
}
