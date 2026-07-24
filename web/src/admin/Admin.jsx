import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Dashboard from './Dashboard.jsx';
import UsersPanel from './UsersPanel.jsx';
import CategoriesTable from './CategoriesTable.jsx';
import CardsTable from './CardsTable.jsx';
import BooksPanel from './BooksPanel.jsx';
import NewsPanel from './NewsPanel.jsx';

export default function Admin() {
  const { isAdmin } = useAuth(); // moderator (bez isAdmin) vidi samo Vesti
  const [tab, setTab] = useState(isAdmin ? 'dashboard' : 'news');
  const [categories, setCategories] = useState([]);
  const [aiReady, setAiReady] = useState(true);
  const [aiInfo, setAiInfo] = useState(null);
  const [toast, setToast] = useState(null);

  const onToast = useCallback((msg, ms = 2600) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  const reloadCats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setCategories(await api.categories(true));
    } catch (e) {
      onToast(e.message);
    }
  }, [onToast, isAdmin]);

  useEffect(() => {
    reloadCats();
    if (!isAdmin) return;
    api
      .health()
      .then((h) => {
        setAiReady(h.aiReady);
        setAiInfo(h.ai || null);
      })
      .catch(() => {});
  }, [reloadCats, isAdmin]);

  const aiHint = aiInfo
    ? aiInfo.ready
      ? `AI: ${aiInfo.provider} · ${aiInfo.model} ✅`
      : `AI (${aiInfo.provider} · ${aiInfo.model}) nije spreman${aiInfo.note ? ` — ${aiInfo.note}` : aiInfo.error ? ` — ${aiInfo.error}` : ''}`
    : '';

  return (
    <div className="admin">
      <Link className="back" to="/app">
        ← Nazad na feed
      </Link>
      <h1>Admin · Digitalni Zenit</h1>
      <div className="sub">{isAdmin ? 'Upravljanje sadržajem, korisnicima i vestima.' : 'Uređivanje vesti i objava.'} {isAdmin && aiHint}</div>

      <div className="tabs">
        {isAdmin && (
          <>
            <button className={`tab${tab === 'dashboard' ? ' on' : ''}`} onClick={() => setTab('dashboard')}>📊 Pregled</button>
            <button className={`tab${tab === 'users' ? ' on' : ''}`} onClick={() => setTab('users')}>👥 Korisnici</button>
          </>
        )}
        <button className={`tab${tab === 'news' ? ' on' : ''}`} onClick={() => setTab('news')}>📰 Vesti</button>
        {isAdmin && (
          <>
            <button className={`tab${tab === 'categories' ? ' on' : ''}`} onClick={() => setTab('categories')}>Kategorije</button>
            <button className={`tab${tab === 'cards' ? ' on' : ''}`} onClick={() => setTab('cards')}>Kartice</button>
            <button className={`tab${tab === 'books' ? ' on' : ''}`} onClick={() => setTab('books')}>Knjige</button>
          </>
        )}
      </div>

      {tab === 'dashboard' && isAdmin && <Dashboard />}
      {tab === 'users' && isAdmin && <UsersPanel onToast={onToast} />}
      {tab === 'news' && <NewsPanel onToast={onToast} />}
      {tab === 'categories' && isAdmin && <CategoriesTable categories={categories} reload={reloadCats} onToast={onToast} aiReady={aiReady} aiHint={aiHint} />}
      {tab === 'cards' && isAdmin && <CardsTable categories={categories} onToast={onToast} />}
      {tab === 'books' && isAdmin && <BooksPanel onToast={onToast} aiReady={aiReady} aiHint={aiHint} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
