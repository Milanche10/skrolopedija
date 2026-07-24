import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import './site.css';

const NAV = [
  { to: '/', label: 'Početna', end: true },
  { to: '/o-nama', label: 'O nama' },
  { to: '/stubovi', label: 'Naši stubovi' },
  { to: '/baza-znanja', label: 'Baza znanja' },
  { to: '/partneri', label: 'Partneri' },
  { to: '/vesti', label: 'Vesti' },
  { to: '/tim', label: 'Tim' },
  { to: '/kontakt', label: 'Kontakt' },
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
            <h4>Organizacija</h4>
            <Link to="/o-nama">O nama</Link>
            <Link to="/stubovi">Naši stubovi</Link>
            <Link to="/oblasti">Oblasti rada</Link>
            <Link to="/tim">Tim</Link>
            <Link to="/vesti">Vesti</Link>
          </div>
          <div>
            <h4>Saradnja</h4>
            <Link to="/partneri">Partneri</Link>
            <Link to="/za-skole">Za škole</Link>
            <Link to="/za-kompanije">Za kompanije</Link>
            <Link to="/podrzi">Podrži nas</Link>
          </div>
          <div>
            <h4>Resursi</h4>
            <Link to="/baza-znanja">Baza znanja</Link>
            <Link to="/app">Skrolpedija</Link>
            <Link to="/kontakt">Kontakt</Link>
            <Link to="/privatnost">Politika privatnosti</Link>
            <Link to="/uslovi">Uslovi korišćenja</Link>
          </div>
        </div>
        <div className="dz-container dz-foot-bottom">
          © {2026} Digitalni Zenit. Sva prava zadržana.
        </div>
      </footer>
    </div>
  );
}
