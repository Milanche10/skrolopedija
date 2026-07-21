// Svi pozivi idu kroz Vite proxy (dev) / Netlify redirect (prod) na /api → api servis.
const BASE = '/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Besplatni hosting (Render) uspava servis posle 15 min — prvi poziv posle pauze
// vrati 502/503/504 dok se budi (~30-50s). GET pozive zato ponovimo par puta.
async function req(path, opts = {}, attempt = 0) {
  let res;
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    // mrežna greška (npr. tajm-aut buđenja) — ponovi za GET
    const method = (opts.method || 'GET').toUpperCase();
    if (method === 'GET' && attempt < 4) {
      await sleep(3000 * (attempt + 1));
      return req(path, opts, attempt + 1);
    }
    throw err;
  }
  const waking = res.status === 502 || res.status === 503 || res.status === 504;
  const method = (opts.method || 'GET').toUpperCase();
  if (waking && method === 'GET' && attempt < 4) {
    await sleep(3000 * (attempt + 1));
    return req(path, opts, attempt + 1);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Greška ${res.status}`);
  return data;
}

export const api = {
  health: () => req('/health'),

  // kategorije
  categories: (all = false) => req(`/categories${all ? '?all=1' : ''}`),
  createCategory: (body) => req('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => req(`/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id) => req(`/categories/${id}`, { method: 'DELETE' }),
  generate: (id, count = 5) => req(`/categories/${id}/generate`, { method: 'POST', body: { count } }),
  collect: (id, count = 6) => req(`/collect/${id}`, { method: 'POST', body: { count } }),

  // kartice
  cards: (params = '') => req(`/cards${params}`),
  createCard: (body) => req('/cards', { method: 'POST', body }),
  updateCard: (id, body) => req(`/cards/${id}`, { method: 'PUT', body }),
  deleteCard: (id) => req(`/cards/${id}`, { method: 'DELETE' }),
  save: (id) => req(`/cards/${id}/save`, { method: 'POST' }),
  unsave: (id) => req(`/cards/${id}/save`, { method: 'DELETE' }),
  // sačuvaj efemernu (AI-generisanu) karticu — tek tada ide u bazu
  saveNew: (card) => req('/cards/save-new', { method: 'POST', body: card }),
  // AI objašnjenje: mode = eli10 | example | deeper
  explain: ({ title, text, mode }) => req('/cards/explain', { method: 'POST', body: { title, text, mode } }),
  seen: (id) => req(`/cards/${id}/seen`, { method: 'POST' }),
  quizAnswer: (id, correct) => req(`/cards/${id}/quiz-answer`, { method: 'POST', body: { correct } }),
  // adaptivni signal: kind = know | dont_know | skip
  signal: ({ cardId = null, categoryId, kind, dwellMs = 0 }) =>
    req('/cards/signal', { method: 'POST', body: { cardId, categoryId, kind, dwellMs } }),

  // feed
  feed: ({ categories = [], filter = 'all', seed = 'skrol', cursor = '0-0', limit = 10, since = '' }) => {
    const q = new URLSearchParams({ filter, seed, cursor: String(cursor), limit: String(limit) });
    if (categories.length) q.set('categories', categories.join(','));
    if (since) q.set('since', since);
    return req(`/feed?${q}`);
  },
  // sveže AI kartice (efemerne, ne u bazi) za „konstantno nov" feed
  fresh: ({ categories = [], count = 4, avoid = [] }) =>
    req('/feed/fresh', { method: 'POST', body: { categories, count, avoid } }),

  // korisnik
  state: () => req('/user/state'),
  stats: () => req('/user/stats'),
  visit: () => req('/user/visit', { method: 'POST' }),
  setFilters: (body) => req('/user/filters', { method: 'PUT', body }),

  // knjige
  books: () => req('/books'),
  book: (id) => req(`/books/${id}`),
  scan: () => req('/books/scan', { method: 'POST', body: {} }),
  processBook: (id) => req(`/books/${id}/process`, { method: 'POST' }),
  deleteBook: (id) => req(`/books/${id}`, { method: 'DELETE' }),
  uploadBook: async (file, meta = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    for (const [k, v] of Object.entries(meta)) if (v) fd.append(k, v);
    const res = await fetch(`${BASE}/books/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Upload nije uspeo');
    return data;
  },
};
