import { useState } from 'react';
import { api } from '../api.js';

const EMPTY = { key: '', label: '', color: '#8b5cf6', icon: '📚', sortOrder: 0 };

export default function CategoriesTable({ categories, reload, onToast, aiReady, aiHint }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  async function create() {
    if (!draft.key || !draft.label) return onToast('key i label su obavezni');
    try {
      await api.createCategory(draft);
      setDraft(EMPTY);
      onToast('Kategorija dodata');
      reload();
    } catch (e) {
      onToast(e.message);
    }
  }

  async function saveEdit(id) {
    try {
      await api.updateCategory(id, editing);
      setEditing(null);
      onToast('Sačuvano');
      reload();
    } catch (e) {
      onToast(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Obrisati kategoriju i sve njene kartice?')) return;
    await api.deleteCategory(id).catch((e) => onToast(e.message));
    reload();
  }

  async function generate(id) {
    setBusy('gen' + id);
    try {
      const r = await api.generate(id, 5);
      onToast(`AI: dodato ${r.created} kartica`);
      reload();
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function collect(id) {
    setBusy('web' + id);
    try {
      const r = await api.collect(id, 6);
      onToast(`Web: dodato ${r.created} kartica`);
      reload();
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function makeQuizzes(id) {
    setBusy('quiz' + id);
    try {
      const r = await api.quizzes(id, 5);
      onToast(`Kvizovi: dodato ${r.created}`);
      reload();
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="card-box">
        <strong>Nova kategorija</strong>
        <div className="grid2" style={{ marginTop: 10 }}>
          <input placeholder="key (npr. astronomija)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <input placeholder="Naziv" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          <input placeholder="emoji" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 10 }} onClick={create}>
          Dodaj kategoriju
        </button>
      </div>

      {!aiReady && <p className="muted">⚠️ {aiHint || 'AI nije spreman.'} Dugmad „AI +5" i „Web" neće raditi dok se AI ne osposobi.</p>}

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Boja</th>
            <th>Ikona</th>
            <th>Key</th>
            <th>Naziv</th>
            <th>Kartica</th>
            <th>Aktivna</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => {
            const e = editing?.id === c.id;
            return (
              <tr key={c.id}>
                <td>
                  {e ? (
                    <input type="color" value={editing.color} onChange={(ev) => setEditing({ ...editing, color: ev.target.value })} />
                  ) : (
                    <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 6, background: c.color }} />
                  )}
                </td>
                <td>{e ? <input value={editing.icon} onChange={(ev) => setEditing({ ...editing, icon: ev.target.value })} /> : c.icon}</td>
                <td className="muted">{c.key}</td>
                <td>{e ? <input value={editing.label} onChange={(ev) => setEditing({ ...editing, label: ev.target.value })} /> : c.label}</td>
                <td>{c.cardCount ?? 0}</td>
                <td>{c.isActive ? '✅' : '—'}</td>
                <td>
                  <div className="row-actions">
                    {e ? (
                      <>
                        <button className="btn" onClick={() => saveEdit(c.id)}>
                          Sačuvaj
                        </button>
                        <button className="btn ghost" onClick={() => setEditing(null)}>
                          Otkaži
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn ghost" onClick={() => setEditing({ id: c.id, label: c.label, color: c.color, icon: c.icon, isActive: c.isActive })}>
                          Izmeni
                        </button>
                        <button className="btn" disabled={busy === 'gen' + c.id} onClick={() => generate(c.id)}>
                          {busy === 'gen' + c.id ? '…' : '✨ AI +5'}
                        </button>
                        <button className="btn ghost" disabled={busy === 'quiz' + c.id} onClick={() => makeQuizzes(c.id)}>
                          {busy === 'quiz' + c.id ? '…' : '🧠 Kviz'}
                        </button>
                        <button className="btn ghost" disabled={busy === 'web' + c.id} onClick={() => collect(c.id)}>
                          {busy === 'web' + c.id ? '…' : '🌐 Web'}
                        </button>
                        <button className="btn danger" onClick={() => remove(c.id)}>
                          Obriši
                        </button>
                      </>
                    )}
                  </div>
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
