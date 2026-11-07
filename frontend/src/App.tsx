import { Route, Routes } from 'react-router';
import { Landing } from './pages/landing/Landing';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<p>Sayfa bulunamadı.</p>} />
    </Routes>
  );
}
