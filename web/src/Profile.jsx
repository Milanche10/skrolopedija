import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { rgba } from './components/hexUtil.js';

export default function Profile() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="profile">
        <Link className="back" to="/">← Nazad na feed</Link>
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

  const { xp, level, totals, achievements, heatmap } = stats;
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div className="profile">
      <Link className="back" to="/">← Nazad na feed</Link>

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

      {/* Bedževi */}
      <h2 className="sec-title">Bedževi <span className="muted">({earned}/{achievements.length})</span></h2>
      <section className="ach-grid">
        {achievements.map((a) => (
          <div key={a.key} className={`ach${a.earned ? ' on' : ''}`} title={a.desc}>
            <div className="ach-icon">{a.earned ? a.icon : '🔒'}</div>
            <div className="ach-label">{a.label}</div>
            <div className="ach-desc muted">{a.desc}</div>
            {!a.earned && (
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
