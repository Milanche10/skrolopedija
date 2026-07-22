import { useEffect, useState } from 'react';
import { api } from '../api.js';

const fmt = (n) => (n ?? 0).toLocaleString('sr-RS');

// Poslednjih 14 dana → [{day:'12.7', count}]
function bucketSignups(dates) {
  const days = [];
  const now = new Date();
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const counts = {};
  for (const iso of dates || []) {
    const d = new Date(iso);
    counts[key(d)] = (counts[key(d)] || 0) + 1;
  }
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ label: `${d.getDate()}.${d.getMonth() + 1}`, count: counts[key(d)] || 0 });
  }
  return days;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.adminDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="dash-err">Greška: {err}</div>;
  if (!data) return <div className="dash-loading"><div className="spinner" /> Učitavam statistiku…</div>;

  const t = data.totals;
  const stats = [
    { k: 'users', label: 'Korisnika', val: t.users, icon: '👤', accent: true },
    { k: 'activeWeek', label: 'Aktivni (7 dana)', val: t.activeWeek, icon: '🔥' },
    { k: 'paidUsers', label: 'Premium', val: t.paidUsers, icon: '⭐' },
    { k: 'admins', label: 'Admini', val: t.admins, icon: '🛡️' },
    { k: 'cards', label: 'Kartica', val: t.cards, icon: '🃏' },
    { k: 'quizzes', label: 'Kvizova', val: t.quizzes, icon: '❓' },
    { k: 'categories', label: 'Kategorija', val: t.categories, icon: '📂' },
    { k: 'books', label: 'Knjiga', val: t.books, icon: '📚' },
    { k: 'signals', label: 'Swipe signala', val: t.signals, icon: '👆' },
    { k: 'answers', label: 'Odgovora na kviz', val: t.answers, icon: '✍️' },
  ];

  const signups = bucketSignups(data.signups);
  const maxSignup = Math.max(1, ...signups.map((s) => s.count));
  const totalSignups = signups.reduce((a, s) => a + s.count, 0);
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.count));
  const maxSrc = Math.max(1, ...data.bySource.map((s) => s.count));
  const srcLabel = { seed: 'Seed', ai: 'AI', book: 'Knjige', web: 'Web' };
  const srcColor = { seed: '#8b5cf6', ai: '#22c55e', book: '#f59e0b', web: '#38bdf8' };

  return (
    <div className="dash">
      {/* Ključni brojevi */}
      <div className="dash-cards">
        {stats.map((s) => (
          <div key={s.k} className={`dash-card${s.accent ? ' accent' : ''}`}>
            <div className="dash-card-icon">{s.icon}</div>
            <div className="dash-card-num">{fmt(s.val)}</div>
            <div className="dash-card-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Registracije (14 dana) */}
      <div className="dash-panel">
        <div className="dash-panel-head">
          <h3>Registracije — poslednjih 14 dana</h3>
          <span className="dash-badge">{totalSignups} novih</span>
        </div>
        <div className="spark">
          {signups.map((s, i) => (
            <div className="spark-col" key={i} title={`${s.label}: ${s.count}`}>
              <div className="spark-bar" style={{ height: `${(s.count / maxSignup) * 100}%` }} />
              <span className="spark-x">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-two">
        {/* Kartice po kategoriji */}
        <div className="dash-panel">
          <div className="dash-panel-head"><h3>Kartice po kategoriji</h3></div>
          <div className="hbars">
            {data.byCategory.map((c) => (
              <div className="hbar-row" key={c.label}>
                <span className="hbar-lbl" title={c.label}>{c.label}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(c.count / maxCat) * 100}%`, background: c.color || 'var(--accent)' }} />
                </div>
                <span className="hbar-num">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Kartice po izvoru */}
        <div className="dash-panel">
          <div className="dash-panel-head"><h3>Kartice po izvoru</h3></div>
          <div className="hbars">
            {data.bySource.map((s) => (
              <div className="hbar-row" key={s.source}>
                <span className="hbar-lbl">{srcLabel[s.source] || s.source}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(s.count / maxSrc) * 100}%`, background: srcColor[s.source] || 'var(--accent)' }} />
                </div>
                <span className="hbar-num">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
