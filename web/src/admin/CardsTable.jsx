import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

export default function CardsTable({ categories, onToast }) {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [catFilter, setCatFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (catFilter) params.set('categoryId', catFilter);
    if (q) params.set('q', q);
    try {
      setData(await api.cards('?' + params));
    } catch (e) {
      onToast(e.message);
    }
  }, [page, catFilter, q, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit() {
    try {
      await api.updateCard(editing.id, { title: editing.title, text: editing.text, isActive: editing.isActive });
      setEditing(null);
      onToast('Kartica sačuvana');
      load();
    } catch (e) {
      onToast(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Obrisati karticu?')) return;
    await api.deleteCard(id).catch((e) => onToast(e.message));
    load();
  }

  const pages = Math.ceil(data.total / data.pageSize) || 1;

  return (
    <div>
      <div className="card-box" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} style={{ width: 220 }}>
          <option value="">Sve kategorije</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        <input placeholder="Pretraga…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ width: 220 }} />
        <span className="muted">Ukupno: {data.total}</span>
      </div>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Kategorija</th>
            <th>Tip</th>
            <th>Naslov</th>
            <th>Izvor</th>
            <th>Akt.</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((c) => (
            <tr key={c.id}>
              <td className="muted">{c.id}</td>
              <td>{c.category?.icon} {c.category?.label}</td>
              <td>{c.type}</td>
              <td style={{ maxWidth: 320 }}>
                {editing?.id === c.id ? (
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                ) : (
                  c.title
                )}
              </td>
              <td className="muted">{c.source}{c.sourceRef ? ` · ${c.sourceRef}` : ''}</td>
              <td>{c.isActive ? '✅' : '—'}</td>
              <td>
                <div className="row-actions">
                  {editing?.id === c.id ? (
                    <>
                      <button className="btn" onClick={saveEdit}>Sačuvaj</button>
                      <button className="btn ghost" onClick={() => setEditing(null)}>Otkaži</button>
                    </>
                  ) : (
                    <>
                      <button className="btn ghost" onClick={() => setEditing({ id: c.id, title: c.title, text: c.text, isActive: c.isActive })}>Izmeni</button>
                      <button className="btn ghost" onClick={() => api.updateCard(c.id, { isActive: !c.isActive }).then(load)}>
                        {c.isActive ? 'Sakrij' : 'Vrati'}
                      </button>
                      <button className="btn danger" onClick={() => remove(c.id)}>Obriši</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {editing && (
        <div className="card-box" style={{ marginTop: 12 }}>
          <strong>Uredi tekst kartice #{editing.id}</strong>
          <textarea rows={4} style={{ marginTop: 8 }} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
        <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prethodna</button>
        <span className="muted">{page} / {pages}</span>
        <button className="btn ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Sledeća →</button>
      </div>
    </div>
  );
}
