import { Route, Routes } from 'react-router';

// Yer tutucu: tanıtım sayfası 2. görevde buraya taşınır.
function Home() {
  return <h1 className="app-placeholder">Bookpal</h1>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<p>Sayfa bulunamadı.</p>} />
    </Routes>
  );
}
