import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import CardView from './components/CardView.jsx';
import StoriesBar from './components/StoriesBar.jsx';
import FilterSheet from './components/FilterSheet.jsx';

const LIMIT = 8;
const randomSeed = () => Math.random().toString(36).slice(2, 8);

export default function App() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [streak, setStreak] = useState(0);
  const [filters, setFilters] = useState({ categories: [], filter: 'all' });
  const [seed, setSeed] = useState(randomSeed());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(1);
  const [toast, setToast] = useState(null);
  const [pullHint, setPullHint] = useState(false);

  const cursor = useRef('0-0');
  const sessionStart = useRef(new Date().toISOString());
  const hasMore = useRef(true);
  const loadingMore = useRef(false);
  const feedRef = useRef(null);
  const touchStartY = useRef(0);

  const showToast = useCallback((msg, ms = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  // početno učitavanje: kategorije, korisničko stanje, streak
  useEffect(() => {
    (async () => {
      try {
        const [cats, state, visit] = await Promise.all([api.categories(), api.state(), api.visit()]);
        setCategories(cats.filter((c) => c.isActive));
        setSavedIds(new Set(state.savedIds));
        setStreak(visit.count);
        if (state.filters && (state.filters.categories?.length || state.filters.filter)) {
          setFilters({ categories: state.filters.categories || [], filter: state.filters.filter || 'all' });
        }
      } catch (e) {
        showToast('Greška pri učitavanju: ' + e.message, 4000);
      }
    })();
  }, [showToast]);

  const loadFeed = useCallback(
    async (reset, useSeed, useFilters) => {
      if (loadingMore.current) return;
      loadingMore.current = true;
      if (reset) setLoading(true);
      try {
        const res = await api.feed({
          categories: useFilters.categories,
          filter: useFilters.filter,
          seed: useSeed,
          cursor: reset ? '0-0' : cursor.current,
          limit: LIMIT,
          since: sessionStart.current,
        });
        cursor.current = res.nextCursor;
        hasMore.current = res.hasMore;
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      } catch (e) {
        showToast('Feed greška: ' + e.message, 4000);
      } finally {
        loadingMore.current = false;
        setLoading(false);
      }
    },
    [showToast]
  );

  // (ponovo) učitaj feed kad se promene filteri ili seed
  useEffect(() => {
    cursor.current = '0-0';
    sessionStart.current = new Date().toISOString();
    hasMore.current = true;
    if (feedRef.current) feedRef.current.scrollTop = 0;
    loadFeed(true, seed, filters);
  }, [seed, filters, loadFeed]);

  // beleži viđene kartice + poziciju + dopunjava feed
  function onScroll() {
    const el = feedRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setPosition(idx + 1);
    const current = items[idx];
    if (current && !current.seen) {
      current.seen = true;
      api.seen(current.id).catch(() => {});
    }
    if (idx >= items.length - 3 && hasMore.current) loadFeed(false, seed, filters);
  }

  // pull-to-refresh: povuci nadole na vrhu → promešaj (novi seed)
  function onTouchStart(e) {
    if (feedRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
    else touchStartY.current = -1;
  }
  function onTouchMove(e) {
    if (touchStartY.current < 0) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    setPullHint(dy > 60);
  }
  function onTouchEnd(e) {
    if (touchStartY.current < 0) return setPullHint(false);
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 90) {
      setSeed(randomSeed());
      showToast('Feed promešan 🔀');
    }
    setPullHint(false);
  }

  async function save(id) {
    setSavedIds((s) => new Set(s).add(id));
    try {
      await api.save(id);
    } catch {
      setSavedIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }
  async function unsave(id) {
    setSavedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    await api.unsave(id).catch(() => {});
    if (filters.filter === 'saved') setSeed(randomSeed());
  }
  function onQuizAnswer(id, correct) {
    api.quizAnswer(id, correct).catch(() => {});
  }

  function toggleStory(catId) {
    setFilters((f) => {
      const single = f.categories.length === 1 && f.categories[0] === catId;
      const next = { categories: single ? [] : [catId], filter: f.filter === 'saved' ? 'all' : f.filter };
      api.setFilters(next).catch(() => {});
      return next;
    });
  }
  function clearStory() {
    const next = { categories: [], filter: 'all' };
    setFilters(next);
    api.setFilters(next).catch(() => {});
  }
  function applyFilters(next) {
    setSheetOpen(false);
    setFilters(next);
    api.setFilters(next).catch(() => {});
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-row">
            <div className="brand">
              Skrol<span>opedija</span>
            </div>
            <div className="top-actions">
              <span className="streak-pill">🔥 {streak}</span>
              <button className="icon-btn" onClick={() => setSheetOpen(true)} aria-label="Filteri">
                ☰
              </button>
              <Link className="icon-btn" to="/admin" aria-label="Admin" style={{ textDecoration: 'none' }}>
                ⚙️
              </Link>
            </div>
          </div>
          <StoriesBar categories={categories} selected={filters.categories} onToggle={toggleStory} onClear={clearStory} />
        </div>
      </div>

      {pullHint && <div className="pull-hint">↓ Pusti da promešaš</div>}

      {loading ? (
        <div className="center-msg">
          <div className="spinner" />
          <div>Učitavam feed…</div>
        </div>
      ) : items.length === 0 ? (
        <div className="center-msg">
          <div style={{ fontSize: 48 }}>🗂️</div>
          <div>Nema kartica za izabrane filtere.</div>
          <button className="preset on" onClick={clearStory}>
            Prikaži sve
          </button>
        </div>
      ) : (
        <div
          className="feed"
          ref={feedRef}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {items.map((card) => (
            <CardView
              key={card.id}
              card={card}
              saved={savedIds.has(card.id)}
              onSave={save}
              onUnsave={unsave}
              onQuizAnswer={onQuizAnswer}
              onToast={showToast}
            />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="position-counter">
          {position} / {items.length}
          {hasMore.current ? '+' : ''}
        </div>
      )}

      {sheetOpen && (
        <FilterSheet
          categories={categories}
          initial={filters}
          onApply={applyFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
