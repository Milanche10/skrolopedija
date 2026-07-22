import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.leaderboard().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="profile"><Link className="back" to="/">← Nazad</Link><p className="muted">Greška: {err}</p></div>;
  if (!data) return <div className="center-msg"><div className="spinner" /><div>Učitavam rang listu…</div></div>;

  const { top, me, totalRanked } = data;
  const meInTop = me && top.some((r) => r.userId === me.userId);

  return (
    <div className="profile lb">
      <Link className="back" to="/">← Nazad na feed</Link>
      <h1 className="lb-title">🏆 Rang lista</h1>
      <p className="muted lb-sub">{totalRanked} aktivnih učenika · XP = pročitano×2 + tačan kviz×10 + sačuvano×5 + streak×20</p>

      {top.length === 0 && <p className="muted">Još niko nije skupio XP. Budi prvi — skroluj i uči! 🚀</p>}

      {/* Podijum za top 3 */}
      {top.length >= 3 && (
        <div className="podium">
          {[1, 0, 2].map((i) => {
            const r = top[i];
            if (!r) return null;
            const place = r.rank;
            return (
              <div key={r.userId} className={`podium-col p${place}${me?.userId === r.userId ? ' is-me' : ''}`}>
                <div className="podium-medal">{medal(place)}</div>
                <div className="podium-ava">{r.levelIcon}</div>
                <div className="podium-name" title={r.username}>{r.name}</div>
                <div className="podium-xp">{r.xp} XP</div>
                <div className="podium-stand">{place}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista */}
      <div className="lb-list">
        {top.map((r) => (
          <div key={r.userId} className={`lb-row${me?.userId === r.userId ? ' is-me' : ''}`}>
            <div className="lb-rank">{medal(r.rank)}</div>
            <div className="lb-lvl" title={r.levelName}>{r.levelIcon}</div>
            <div className="lb-name">
              {r.name}
              {me?.userId === r.userId && <span className="u-you">ti</span>}
              <div className="lb-lvlname muted">{r.levelName}{r.streak > 0 ? ` · 🔥${r.streak}` : ''}</div>
            </div>
            <div className="lb-xp">{r.xp} <span className="muted">XP</span></div>
          </div>
        ))}
      </div>

      {/* Moja pozicija ako nisam u top listi */}
      {me && !meInTop && (
        <>
          <div className="lb-sep muted">tvoja pozicija</div>
          <div className="lb-row is-me">
            <div className="lb-rank">#{me.rank}</div>
            <div className="lb-lvl">{me.levelIcon}</div>
            <div className="lb-name">{me.name}<span className="u-you">ti</span><div className="lb-lvlname muted">{me.levelName}</div></div>
            <div className="lb-xp">{me.xp} <span className="muted">XP</span></div>
          </div>
        </>
      )}
      {user && !me && (
        <p className="muted lb-hint">Nisi još na listi — skupi malo XP-a (pročitaj kartice, reši kvizove) i pojavićeš se! 💪</p>
      )}
    </div>
  );
}
