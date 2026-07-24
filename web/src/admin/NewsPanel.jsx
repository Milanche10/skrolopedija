import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CATS = ['vesti', 'radionice', 'projekti', 'konkursi', 'partnerstva', 'gostovanja', 'konferencije'];
const EMPTY = { title: '', category: 'vesti', excerpt: '', body: '', cover: '', published: true };

export default function NewsPanel({ onToast }) {
  const [posts, setPosts] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = () => api.newsAll().then(setPosts).catch((e) => onToast(e.message));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const reset = () => { setForm(EMPTY); setEditId(null); };

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return onToast('Naslov je obavezan');
    setBusy(true);
    try {
      if (editId) await api.updateNews(editId, form);
      else await api.createNews(form);
      onToast(editId ? 'Objava sačuvana ✅' : 'Objava kreirana ✅');
      reset();
      reload();
    } catch (e2) {
      onToast(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(p) {
    setEditId(p.id);
    setForm({ title: p.title, category: p.category, excerpt: p.excerpt || '', body: p.body || '', cover: p.cover || '', published: p.published });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(p) {
    if (!confirm(`Obrisati objavu „${p.title}"?`)) return;
    try {
      await api.deleteNews(p.id);
      onToast('Obrisano');
      if (editId === p.id) reset();
      reload();
    } catch (e) {
      onToast(e.message);
    }
  }

  return (
    <div className="news-admin">
      <form className="news-form" onSubmit={save}>
        <h3>{editId ? '✏️ Izmena objave' : '➕ Nova objava'}</h3>
        <div className="news-form-row">
          <label className="grow">Naslov<input value={form.title} onChange={set('title')} placeholder="Naslov objave" /></label>
          <label>Kategorija
            <select value={form.category} onChange={set('category')}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label>Kratak opis (excerpt)<input value={form.excerpt} onChange={set('excerpt')} placeholder="Jedna-dve rečenice za pregled" /></label>
        <label>Tekst<textarea rows={7} value={form.body} onChange={set('body')} placeholder="Ceo tekst objave. Prazan red = novi pasus." /></label>
        <label>Cover slika (URL, opciono)<input value={form.cover} onChange={set('cover')} placeholder="https://…" /></label>
        <label className="news-check"><input type="checkbox" checked={form.published} onChange={set('published')} /> Objavljeno (vidljivo na sajtu)</label>
        <div className="news-form-actions">
          <button className="btn-primary" disabled={busy} style={{ width: 'auto' }}>{busy ? 'Čuvam…' : editId ? 'Sačuvaj izmene' : 'Objavi'}</button>
          {editId && <button type="button" className="btn-ghost" onClick={reset}>Otkaži</button>}
        </div>
      </form>

      <h3 className="news-list-title">Sve objave {posts && <span className="muted">({posts.length})</span>}</h3>
      {!posts && <div className="dash-loading"><div className="spinner" /> Učitavam…</div>}
      <div className="news-list">
        {posts?.map((p) => (
          <div className={`news-item${!p.published ? ' draft' : ''}`} key={p.id}>
            <div className="news-item-main">
              <span className="news-item-cat">{p.category}</span>
              <span className="news-item-title">{p.title}</span>
              {!p.published && <span className="news-item-draft">skica</span>}
            </div>
            <div className="news-item-actions">
              <button className="btn-ghost" onClick={() => edit(p)}>✏️</button>
              <button className="u-del" onClick={() => remove(p)}>🗑</button>
            </div>
          </div>
        ))}
        {posts && posts.length === 0 && <p className="muted">Još nema objava. Napravi prvu gore ↑</p>}
      </div>
    </div>
  );
}
