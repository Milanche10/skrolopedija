import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const ROLE_OPTS = [
  { v: 'user', label: '🙂 Korisnik' },
  { v: 'premium', label: '⭐ Premium' },
  { v: 'moderator', label: '⚖️ Moderator' },
  { v: 'admin', label: '🛡️ Admin' },
  { v: 'superadmin', label: '👑 Super Admin' },
];
const RANK = { guest: 0, user: 1, premium: 2, moderator: 3, admin: 4, superadmin: 5 };

export default function UsersPanel({ onToast }) {
  const { user: me, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const reload = () => api.adminUsers().then(setUsers).catch((e) => onToast(e.message));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      [u.username, u.email, u.firstName, u.lastName].filter(Boolean).some((x) => x.toLowerCase().includes(s))
    );
  }, [users, q]);

  // Sme li aktuelni admin da menja ovaj red?
  const canEdit = (u) => {
    if (u.id === me?.id) return false; // ne diraj sam sebe ovde
    if (RANK[u.role] >= RANK.admin && !isSuperAdmin) return false; // admin naloge samo superadmin
    return true;
  };

  async function setRole(u, role) {
    setBusyId(u.id);
    try {
      const updated = await api.adminUpdateUser(u.id, { role });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      onToast(`${u.username}: role → ${role}`);
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusyId(null);
    }
  }
  async function togglePaid(u) {
    setBusyId(u.id);
    try {
      const updated = await api.adminUpdateUser(u.id, { paid: !u.paid });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusyId(null);
    }
  }
  async function remove(u) {
    if (!confirm(`Obrisati korisnika @${u.username} (${u.email})? Ovo briše i sav njegov napredak.`)) return;
    setBusyId(u.id);
    try {
      await api.adminDeleteUser(u.id);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      onToast(`Obrisan: @${u.username}`);
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!users) return <div className="dash-loading"><div className="spinner" /> Učitavam korisnike…</div>;

  return (
    <div className="users-panel">
      <div className="users-toolbar">
        <input className="users-search" placeholder="🔎 Pretraga (ime, username, email)" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted">{filtered.length} / {users.length}</span>
      </div>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr><th>#</th><th>Korisnik</th><th>Role</th><th>Premium</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const editable = canEdit(u);
              const isMe = u.id === me?.id;
              // opcije role: ne-superadmin ne može dodeliti admin/superadmin
              const opts = ROLE_OPTS.filter((o) => isSuperAdmin || RANK[o.v] < RANK.admin);
              return (
                <tr key={u.id} className={isMe ? 'me-row' : ''}>
                  <td className="muted">{u.id}</td>
                  <td>
                    <div className="u-name">{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username} {isMe && <span className="u-you">ti</span>}</div>
                    <div className="u-sub muted">@{u.username} · {u.email}</div>
                  </td>
                  <td>
                    <select
                      className="u-role"
                      value={u.role}
                      disabled={!editable || busyId === u.id}
                      onChange={(e) => setRole(u, e.target.value)}
                    >
                      {/* trenutna rola uvek vidljiva čak i ako je van dozvoljenih */}
                      {!opts.find((o) => o.v === u.role) && <option value={u.role}>{u.role}</option>}
                      {opts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <button
                      className={`paid-toggle${u.paid ? ' on' : ''}`}
                      disabled={!editable || busyId === u.id}
                      onClick={() => togglePaid(u)}
                      title="Premium pristup"
                    >
                      {u.paid ? '⭐ Da' : '— Ne'}
                    </button>
                  </td>
                  <td>
                    <button className="u-del" disabled={isMe || !editable || busyId === u.id} onClick={() => remove(u)} title={isMe ? 'Ne možeš obrisati sebe' : 'Obriši'}>
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
