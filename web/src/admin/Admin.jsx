import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CategoriesTable from './CategoriesTable.jsx';
import CardsTable from './CardsTable.jsx';
import BooksPanel from './BooksPanel.jsx';

export default function Admin() {
  const [tab, setTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [aiReady, setAiReady] = useState(true);
  const [aiInfo, setAiInfo] = useState(null);
  const [toast, setToast] = useState(null);

  const onToast = useCallback((msg, ms = 2600) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  const reloadCats = useCallback(async () => {
    try {
      setCategories(await api.categories(true));
    } catch (e) {
      onToast(e.message);
    }
  }, [onToast]);

  useEffect(() => {
    reloadCats();
    api
      .health()
      .then((h) => {
        setAiReady(h.aiReady);
        setAiInfo(h.ai || null);
      })
      .catch(() => {});
  }, [reloadCats]);

  const aiHint = aiInfo
    ? aiInfo.ready
      ? `AI: ${aiInfo.provider} · ${aiInfo.model} ✅`
      : `AI (${aiInfo.provider} · ${aiInfo.model}) nije spreman${aiInfo.note ? ` — ${aiInfo.note}` : aiInfo.error ? ` — ${aiInfo.error}` : ''}`
    : '';

  return (
    <div className="admin">
      <Link className="back" to="/">
        ← Nazad na feed
      </Link>
      <h1>Admin · Skrolopedija</h1>
      <div className="sub">Upravljanje kategorijama, karticama i knjigama. {aiHint}</div>

      <div className="tabs">
        <button className={`tab${tab === 'categories' ? ' on' : ''}`} onClick={() => setTab('categories')}>
          Kategorije
        </button>
        <button className={`tab${tab === 'cards' ? ' on' : ''}`} onClick={() => setTab('cards')}>
          Kartice
        </button>
        <button className={`tab${tab === 'books' ? ' on' : ''}`} onClick={() => setTab('books')}>
          Knjige
        </button>
      </div>

      {tab === 'categories' && <CategoriesTable categories={categories} reload={reloadCats} onToast={onToast} aiReady={aiReady} aiHint={aiHint} />}
      {tab === 'cards' && <CardsTable categories={categories} onToast={onToast} />}
      {tab === 'books' && <BooksPanel onToast={onToast} aiReady={aiReady} aiHint={aiHint} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
