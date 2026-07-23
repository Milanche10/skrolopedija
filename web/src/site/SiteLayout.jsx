import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import './site.css';

const NAV = [
  { to: '/', label: 'Početna', end: true },
  { to: '/o-nama', label: 'O nama' },
  { to: '/stubovi', label: 'Naši stubovi' },
  { to: '/partneri', label: 'Partneri' },
  { to: '/tim', label: 'Tim' },
  { to: '/kontakt', label: 'Kontakt' },
  { to: '/podrzi', label: 'Podrži' },
];

export default function SiteLayout() {
  const { isAuthed } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="dz">
      <header className="dz-header">
        <div className="dz-container dz-header-inner">
          <Link to="/" className="dz-brand" onClick={() => setOpen(false)}>
            <img src="/logo-mark.svg" alt="" className="dz-brand-mark" />
            <span>Digitalni <b>Zenit</b></span>
          </Link>

          <button className="dz-burger" aria-label="Meni" onClick={() => setOpen((o) => !o)}>
            {open ? '✕' : '☰'}
          </button>

          <nav className={`dz-nav${open ? ' open' : ''}`}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setOpen(false)}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/app" className="dz-cta-btn" onClick={() => setOpen(false)}>
              {isAuthed ? 'Otvori aplikaciju' : 'Prijava'}
            </Link>
          </nav>
        </div>
      </header>

      <main className="dz-main">
        <Outlet />
      </main>

      <footer className="dz-footer">
        <div className="dz-container dz-footer-grid">
          <div>
            <div className="dz-brand dz-brand-footer">
              <img src="/logo-mark.svg" alt="" className="dz-brand-mark" />
              <span>Digitalni <b>Zenit</b></span>
            </div>
            <p className="dz-foot-text">
              Organizacija posvećena razvoju sigurnijeg, pametnijeg i inkluzivnijeg digitalnog društva.
            </p>
          </div>
          <div>
            <h4>Navigacija</h4>
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}>{n.label}</Link>
            ))}
          </div>
          <div>
            <h4>Aplikacija</h4>
            <Link to="/app">Skrolpedija — uči dok skroluješ</Link>
            <Link to="/podrzi">Podrži naš rad</Link>
            <Link to="/kontakt">Kontakt</Link>
          </div>
        </div>
        <div className="dz-container dz-foot-bottom">
          © {2026} Digitalni Zenit. Sva prava zadržana.
        </div>
      </footer>
    </div>
  );
}
