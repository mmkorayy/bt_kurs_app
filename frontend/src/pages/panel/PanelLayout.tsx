import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthProvider';
import './PanelLayout.css';

const TABS = [
  { to: '/panel', label: 'Gün', end: true },
  { to: '/panel/hafta', label: 'Hafta', end: false },
  { to: '/panel/ay', label: 'Ay', end: false },
  { to: '/panel/danisanlar', label: 'Danışanlar', end: false },
];

export function PanelLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="panel">
      <header className="panel-top">
        <Link className="panel-logo" to="/panel">
          Book<span>pal</span>
        </Link>
        <nav className="panel-tabs" aria-label="Panel menüsü">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => (isActive ? 'panel-tab panel-tab-on' : 'panel-tab')}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="panel-user">
          <span>{user?.displayName}</span>
          <button className="panel-logout" type="button" onClick={() => void logout()}>
            Çıkış
          </button>
        </div>
      </header>
      <main className="panel-main">
        <Outlet />
      </main>
    </div>
  );
}
