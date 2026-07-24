import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export const NEWS_CATS = [
  { v: '', label: 'Sve' },
  { v: 'radionice', label: 'Radionice' },
  { v: 'projekti', label: 'Projekti' },
  { v: 'konkursi', label: 'Konkursi' },
  { v: 'partnerstva', label: 'Partnerstva' },
  { v: 'gostovanja', label: 'Gostovanja' },
  { v: 'konferencije', label: 'Konferencije' },
];
export const catLabel = (v) => NEWS_CATS.find((c) => c.v === v)?.label || 'Vesti';
const fmtDate = (iso) => new Date(iso).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' });

/* Lista vesti */
export function Vesti() {
  const [posts, setPosts] = useState(null);
  const [cat, setCat] = useState('');
  const [err, setErr] = useState(null);

  useEffect(() => {
    setPosts(null);
    api.news(cat).then(setPosts).catch((e) => setErr(e.message));
  }, [cat]);

  return (
    <>
      <div className="dz-pagehead">
        <div className="dz-container">
          <span className="dz-eyebrow">Šta je novo u Digitalnom Zenitu</span>
          <h1>Vesti</h1>
        </div>
      </div>
      <section className="dz-section">
        <div className="dz-container">
          <div className="dz-news-filter">
            {NEWS_CATS.map((c) => (
              <button key={c.v} className={cat === c.v ? 'on' : ''} onClick={() => setCat(c.v)}>{c.label}</button>
            ))}
          </div>

          {err && <p className="dz-muted">Greška: {err}</p>}
          {!posts && !err && <p className="dz-muted">Učitavam…</p>}
          {posts && posts.length === 0 && <p className="dz-muted dz-center" style={{ padding: '40px 0' }}>Još nema objava u ovoj kategoriji. Uskoro! 📰</p>}

          <div className="dz-news-grid">
            {posts?.map((p) => (
              <Link to={`/vesti/${p.slug}`} className="dz-news-card" key={p.id}>
                {p.cover && <div className="dz-news-cover" style={{ backgroundImage: `url(${p.cover})` }} />}
                <div className="dz-news-body">
                  <span className="dz-news-cat">{catLabel(p.category)}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <span className="dz-news-date">{fmtDate(p.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* Pojedinačna vest */
export function VestDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.newsOne(slug).then(setPost).catch((e) => setErr(e.message));
  }, [slug]);

  if (err) return <section className="dz-section"><div className="dz-container"><Link to="/vesti" className="dz-back-link">← Sve vesti</Link><p className="dz-muted">Objava nije pronađena.</p></div></section>;
  if (!post) return <section className="dz-section"><div className="dz-container"><p className="dz-muted">Učitavam…</p></div></section>;

  return (
    <>
      <div className="dz-pagehead">
        <div className="dz-container">
          <span className="dz-eyebrow">{catLabel(post.category)} · {fmtDate(post.createdAt)}</span>
          <h1>{post.title}</h1>
        </div>
      </div>
      <section className="dz-section">
        <div className="dz-container dz-article">
          <Link to="/vesti" className="dz-back-link">← Sve vesti</Link>
          {post.cover && <img src={post.cover} alt="" className="dz-article-cover" />}
          {post.excerpt && <p className="dz-lead">{post.excerpt}</p>}
          {post.body.split(/\n\n+/).filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>
    </>
  );
}
