import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { rgba } from './components/hexUtil.js';
import { useAuth } from './auth.jsx';

export default function Profile() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="profile">
        <Link className="back" to="/app">← Nazad na feed</Link>
        <p className="muted">Greška: {error}</p>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="center-msg">
        <div className="spinner" />
        <div>Učitavam profil…</div>
      </div>
    );
  }

  const { xp, level, totals, achievements, heatmap, dna = [], genome = [], curiosity = 0 } = stats;
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div className="profile">
      <Link className="back" to="/app">← Nazad na feed</Link>

      <AccountSection />

      {/* Nivo + XP */}
      <section className="level-card">
        <div className="level-icon">{level.icon}</div>
        <div className="level-body">
          <div className="level-name">{level.name}</div>
          <div className="level-xp">{xp} XP</div>
          <div className="xp-bar">
            <div style={{ width: `${level.progressPct}%` }} />
          </div>
          <div className="level-next muted">
            {level.next ? `Još ${level.next.xpNeeded} XP do: ${level.next.icon} ${level.next.name}` : 'Maksimalan nivo — Legenda! 👑'}
          </div>
        </div>
      </section>

      {/* Ključni brojevi */}
      <section className="stat-grid">
        <div className="stat-box"><div className="stat-num">{totals.seen}</div><div className="stat-lbl">pročitano</div></div>
        <div className="stat-box"><div className="stat-num">{totals.quizCorrect}</div><div className="stat-lbl">tačnih kvizova</div></div>
        <div className="stat-box"><div className="stat-num">🔥 {totals.streak}</div><div className="stat-lbl">dana zaredom</div></div>
        <div className="stat-box"><div className="stat-num">❤️ {totals.saved}</div><div className="stat-lbl">sačuvano</div></div>
      </section>

      <Link to="/leaderboard" className="lb-link">🏆 Vidi rang listu →</Link>

      {/* 🧬 Knowledge DNA */}
      {dna.length > 0 && (
        <>
          <h2 className="sec-title">🧬 Knowledge DNA</h2>
          <div className="dna-bar">
            {dna.map((d) => (
              <div key={d.label} style={{ width: `${d.pct}%`, background: d.color }} title={`${d.label} ${d.pct}%`} />
            ))}
          </div>
          <div className="dna-legend">
            {dna.map((d) => (
              <span key={d.label} className="dna-item">
                <span className="dna-dot" style={{ background: d.color }} />
                {d.icon} {d.label} <b>{d.pct}%</b>
              </span>
            ))}
          </div>
        </>
      )}

      {/* 🧬 Brain Genome */}
      {genome.length > 0 && (
        <>
          <h2 className="sec-title">
            🧬 Brain Genome <span className="muted">· Radoznalost {curiosity}/100</span>
          </h2>
          <div className="genome">
            {genome.map((g) => (
              <div key={g.code} className="gene" title={g.label}>
                <span className="gene-code">{g.code}</span>
                <div className="gene-bar">
                  <div style={{ width: `${g.score}%` }} />
                </div>
                <span className="gene-score">{String(g.score).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            LOG logika · SCI nauka · HIS istorija · SOC društvo · CRE kreativa · CUR radoznalost. Menja se kako učiš.
          </p>
        </>
      )}

      {/* Bedževi */}
      <h2 className="sec-title">Bedževi <span className="muted">({earned}/{achievements.length})</span></h2>
      <section className="ach-grid">
        {achievements.map((a) => (
          <div key={a.key} className={`ach${a.earned ? ' on' : ''}${a.hidden ? ' hidden' : ''}`} title={a.hidden ? 'Skriveni bedž' : a.desc}>
            <div className="ach-icon">{a.earned ? a.icon : a.hidden ? '❓' : '🔒'}</div>
            <div className="ach-label">{a.hidden ? '???' : a.label}</div>
            <div className="ach-desc muted">{a.hidden ? 'Skriveni bedž — otkrij ga sam!' : a.desc}</div>
            {!a.earned && !a.hidden && (
              <div className="ach-bar">
                <div style={{ width: `${a.progressPct}%` }} />
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Knowledge heatmap */}
      <h2 className="sec-title">Mapa znanja</h2>
      <section className="heatmap">
        {heatmap.map((h) => (
          <div key={h.categoryId} className="heat-row">
            <div className="heat-cat">
              <span>{h.icon}</span> {h.label}
            </div>
            <div className="heat-bar" style={{ background: rgba(h.color, 0.14) }}>
              <div style={{ width: `${h.pct}%`, background: h.color }} />
            </div>
            <div className="heat-num muted">{h.seen}/{h.total}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

const ROLE_LABEL = {
  superadmin: '👑 Super Admin',
  admin: '🛡️ Admin',
  moderator: '⚖️ Moderator',
  premium: '⭐ Premium',
  user: '🙂 Korisnik',
};

function AccountSection() {
  const { user, setUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('profile'); // profile | password
  const [form, setForm] = useState({
    username: user?.username || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState(null); // {kind:'ok'|'err', text}
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const roleLabel = ROLE_LABEL[user.role] || (user.paid ? ROLE_LABEL.premium : ROLE_LABEL.user);
  const initials = ((user.firstName?.[0] || user.username?.[0] || user.email?.[0] || '?')).toUpperCase();

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const { user: u } = await api.updateMe({
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      setUser(u);
      setMsg({ kind: 'ok', text: 'Sačuvano ✅' });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message || 'Greška pri čuvanju' });
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setMsg(null);
    if (pw.next.length < 6) return setMsg({ kind: 'err', text: 'Nova lozinka mora imati bar 6 znakova' });
    if (pw.next !== pw.confirm) return setMsg({ kind: 'err', text: 'Lozinke se ne poklapaju' });
    setBusy(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setMsg({ kind: 'ok', text: 'Lozinka promenjena ✅' });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message || 'Greška pri promeni lozinke' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-card">
      <div className="account-head">
        <div className="account-avatar">{initials}</div>
        <div className="account-id">
          <div className="account-name">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}</div>
          <div className="account-meta muted">@{user.username} · {user.email}</div>
          <span className="role-chip">{roleLabel}</span>
        </div>
        <div className="account-actions">
          <button className="btn-ghost" onClick={() => { setOpen((o) => !o); setMsg(null); }}>
            {open ? 'Zatvori' : '✏️ Izmeni'}
          </button>
          <button className="btn-danger" onClick={logout}>Odjava</button>
        </div>
      </div>

      {open && (
        <div className="account-edit">
          <div className="account-tabs">
            <button className={tab === 'profile' ? 'on' : ''} onClick={() => { setTab('profile'); setMsg(null); }}>Podaci</button>
            <button className={tab === 'password' ? 'on' : ''} onClick={() => { setTab('password'); setMsg(null); }}>Lozinka</button>
          </div>

          {msg && <div className={msg.kind === 'ok' ? 'form-ok' : 'form-err'}>{msg.text}</div>}

          {tab === 'profile' ? (
            <form className="account-form" onSubmit={saveProfile}>
              <label>Korisničko ime
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} minLength={3} required />
              </label>
              <div className="form-row">
                <label>Ime
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </label>
                <label>Prezime
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </label>
              </div>
              <button className="btn-primary" disabled={busy}>{busy ? 'Čuvam…' : 'Sačuvaj izmene'}</button>
            </form>
          ) : (
            <form className="account-form" onSubmit={savePassword}>
              <label>Trenutna lozinka
                <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
              </label>
              <div className="form-row">
                <label>Nova lozinka
                  <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} minLength={6} required />
                </label>
                <label>Potvrdi novu
                  <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} minLength={6} required />
                </label>
              </div>
              <button className="btn-primary" disabled={busy}>{busy ? 'Menjam…' : 'Promeni lozinku'}</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
