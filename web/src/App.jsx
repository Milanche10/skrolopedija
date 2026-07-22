import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';
import CardView from './components/CardView.jsx';
import StoriesBar from './components/StoriesBar.jsx';
import FilterSheet from './components/FilterSheet.jsx';
import FeedSkeleton from './components/FeedSkeleton.jsx';

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
  const [generating, setGenerating] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const cursor = useRef('0-0');
  const sessionStart = useRef(new Date().toISOString());
  const hasMore = useRef(true);
  const loadingMore = useRef(false);
  const feedRef = useRef(null);
  const touchStartY = useRef(0);
  const freshTitles = useRef([]); // naslovi sveže generisanih (da se ne ponavljaju)
  const loadingFresh = useRef(false);
  const genTriedEmpty = useRef(false); // da ne ulazimo u petlju kad AI ne vrati ništa
  const currentIdx = useRef(-1); // trenutna kartica (za merenje vremena gledanja)
  const dwellStart = useRef(Date.now());
  const signaledIds = useRef(new Set()); // kartice za koje je poslat eksplicitan signal
  const levelRef = useRef(null); // za detekciju prelaska nivoa

  // proveri da li je korisnik prešao nivo → proslava
  async function checkLevelUp() {
    try {
      const s = await api.stats();
      if (levelRef.current != null && s.level.index > levelRef.current) {
        showToast(`Nivo gore! ${s.level.icon} ${s.level.name} 🎉`, 3800);
      }
      levelRef.current = s.level.index;
    } catch {
      /* nebitno */
    }
  }

  const catIdOf = (card) => card.categoryId ?? card.category?.id;

  // adaptivni signal: know | dont_know | skip
  function sendSignal(card, kind, dwellMs) {
    if (kind !== 'skip') signaledIds.current.add(card.id);
    api
      .signal({ cardId: isEphemeral(card.id) ? null : card.id, categoryId: catIdOf(card), kind, dwellMs: dwellMs ?? Date.now() - dwellStart.current })
      .catch(() => {});
  }

  const isEphemeral = (id) => typeof id === 'string' && id.startsWith('gen_');
  // sveže generisanje ide samo za opšti feed (ne za Sačuvano/Knjige/Kvizovi)
  const freshAllowed = filters.filter === 'all';

  const showToast = useCallback((msg, ms = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  // ako se učitavanje oduži (Render se budi), pokaži poruku umesto praznog ekrana
  useEffect(() => {
    if (!loading) return setSlowLoad(false);
    const t = setTimeout(() => setSlowLoad(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  // početno učitavanje: kategorije, korisničko stanje, streak
  useEffect(() => {
    (async () => {
      try {
        const [cats, state, visit] = await Promise.all([api.categories(), api.state(), api.visit()]);
        setCategories(cats.filter((c) => c.isActive));
        setSavedIds(new Set(state.savedIds));
        setStreak(visit.count);
        api.stats().then((s) => { levelRef.current = s.level.index; }).catch(() => {});
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

  // sveže AI kartice (efemerne) — dopuna feeda da uvek ima „novo". Vraća broj dodatih.
  const loadFresh = useCallback(async () => {
    if (loadingFresh.current) return 0;
    loadingFresh.current = true;
    try {
      const wow = Math.random() < 0.3; // ~svaka treća tura je „Da li znaš da…"
      const res = await api.fresh({
        categories: filters.categories,
        count: wow ? 2 : 4,
        avoid: freshTitles.current.slice(-60),
        wow,
      });
      if (res.items?.length) {
        freshTitles.current.push(...res.items.map((c) => c.title));
        setItems((prev) => [...prev, ...res.items]);
        return res.items.length;
      }
      return 0;
    } catch {
      return 0; // AI limit/greška — feed ostaje sa postojećim karticama
    } finally {
      loadingFresh.current = false;
    }
  }, [filters]);

  // (ponovo) učitaj feed kad se promene filteri ili seed
  useEffect(() => {
    cursor.current = '0-0';
    sessionStart.current = new Date().toISOString();
    hasMore.current = true;
    freshTitles.current = [];
    genTriedEmpty.current = false;
    currentIdx.current = 0;
    dwellStart.current = Date.now();
    signaledIds.current = new Set();
    if (feedRef.current) feedRef.current.scrollTop = 0;
    loadFeed(true, seed, filters);
  }, [seed, filters, loadFeed]);

  // ako u bazi nema kartica za izabrano (a dozvoljeno je) → odmah generiši sveže
  useEffect(() => {
    if (loading || items.length > 0 || !freshAllowed || genTriedEmpty.current) return;
    genTriedEmpty.current = true;
    setGenerating(true);
    loadFresh().finally(() => setGenerating(false));
  }, [loading, items.length, freshAllowed, loadFresh]);

  // beleži viđene kartice + poziciju + vreme gledanja + dopunjava feed
  function onScroll() {
    const el = feedRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setPosition(idx + 1);

    // prelazak na novu karticu → izmeri vreme na prethodnoj (pasivni "skip" signal)
    if (idx !== currentIdx.current) {
      const leaving = items[currentIdx.current];
      if (leaving && !signaledIds.current.has(leaving.id)) {
        const dwell = Date.now() - dwellStart.current;
        if (dwell > 1200) sendSignal(leaving, 'skip', dwell); // dovoljno dugo gledano da se broji
      }
      currentIdx.current = idx;
      dwellStart.current = Date.now();
    }

    const current = items[idx];
    if (current && !current.seen) {
      current.seen = true;
      if (!isEphemeral(current.id)) api.seen(current.id).catch(() => {});
    }
    if (idx >= items.length - 3) {
      if (hasMore.current) loadFeed(false, seed, filters);
      else if (freshAllowed) loadFresh(); // baza iscrpljena → generiši sveže
    }
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
      if (isEphemeral(id)) {
        // efemerna AI kartica — tek sada je upiši u bazu
        const card = items.find((c) => c.id === id);
        if (!card) return;
        const res = await api.saveNew({
          categoryId: card.categoryId ?? card.category?.id,
          title: card.title,
          text: card.text,
          type: card.type,
        });
        const realId = res.card.id;
        setItems((prev) => prev.map((c) => (c.id === id ? { ...c, id: realId, ephemeral: false } : c)));
        setSavedIds((s) => {
          const n = new Set(s);
          n.delete(id);
          n.add(realId);
          return n;
        });
        showToast('Sačuvano u favorite ❤️');
      } else {
        await api.save(id);
      }
      checkLevelUp();
    } catch (e) {
      setSavedIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      showToast('Čuvanje nije uspelo: ' + e.message, 3500);
    }
  }
  async function unsave(id) {
    setSavedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    if (!isEphemeral(id)) await api.unsave(id).catch(() => {});
    if (filters.filter === 'saved') setSeed(randomSeed());
  }
  function onQuizAnswer(id, correct) {
    api.quizAnswer(id, correct).then(checkLevelUp).catch(() => {});
  }

  // „Saznaj više" → ubaci dublje kartice odmah iza trenutne
  async function openDeeper(card) {
    showToast('Kopam dublje… 🔎', 1500);
    try {
      const res = await api.deeper({ title: card.title, text: card.text, categoryId: catIdOf(card), category: card.category });
      if (!res.items?.length) return showToast('Nema dubljih kartica trenutno', 2500);
      setItems((prev) => {
        const i = prev.findIndex((c) => c.id === card.id);
        if (i < 0) return prev;
        const next = [...prev];
        next.splice(i + 1, 0, ...res.items);
        return next;
      });
      showToast('Dodato ispod ↓ ' + res.items.length + ' dubljih kartica');
    } catch (e) {
      showToast('Nije uspelo: ' + e.message, 3000);
    }
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
              <Link className="streak-pill" to="/profile" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Profil i streak">
                🔥 {streak}
              </Link>
              <Link className="icon-btn" to="/profile" aria-label="Profil" style={{ textDecoration: 'none' }}>
                🏆
              </Link>
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
        <FeedSkeleton note={slowLoad ? 'Besplatan server se budi iz stanja mirovanja — samo trenutak…' : undefined} />
      ) : items.length === 0 ? (
        generating ? (
          <div className="center-msg">
            <div className="spinner" />
            <div>Generišem sveže kartice…</div>
          </div>
        ) : (
          <div className="center-msg">
            <div style={{ fontSize: 48 }}>🗂️</div>
            <div>{freshAllowed ? 'AI trenutno nije dostupan za generisanje.' : 'Nema kartica za izabrane filtere.'}</div>
            <button className="preset on" onClick={clearStory}>
              Prikaži sve
            </button>
          </div>
        )
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
              onSignal={(kind) => sendSignal(card, kind)}
              onDeeper={() => openDeeper(card)}
              onToast={showToast}
            />
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="position-counter">
          {position} / {items.length}
          {hasMore.current || freshAllowed ? '+' : ''}
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
