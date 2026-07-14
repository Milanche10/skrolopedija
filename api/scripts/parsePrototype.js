/**
 * Parser za skrolopedija.html prototip: izvlači niz CARDS i objekat CATS
 * iz <script> bloka. Radi balansirano skeniranje zagrada (poštuje stringove
 * i komentare), pa literal izvršava u izolovanom vm kontekstu — bez eval-a
 * nad celim fajlom.
 */
import fs from 'fs';
import vm from 'vm';

/** Nađi literal koji počinje na `startIdx` (na [ ili {) i vrati ceo tekst literala. */
export function extractBalanced(src, startIdx) {
  const open = src[startIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let i = startIdx;
  let inStr = null; // ', " ili `
  let inLineComment = false;
  let inBlockComment = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (prev === '*' && ch === '/') inBlockComment = false;
      continue;
    }
    if (inStr) {
      if (ch === '\\') {
        i++; // preskoči escapovan znak
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      inBlockComment = true;
      continue;
    }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  throw new Error('Nebalansirane zagrade — literal nije zatvoren');
}

/** Izvuci vrednost promenljive `name` (niz ili objekat) iz JS/HTML izvora. */
export function extractVariable(src, name) {
  const re = new RegExp(`(?:const|let|var)?\\s*${name}\\s*=\\s*([\\[{])`);
  const m = re.exec(src);
  if (!m) throw new Error(`Promenljiva ${name} nije nađena u fajlu`);
  const startIdx = m.index + m[0].length - 1;
  const literal = extractBalanced(src, startIdx);
  // izvrši SAMO literal u praznom sandbox kontekstu
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 5000 });
}

/** Normalizuj jedan zapis kategorije iz CATS (toleriše više oblika). */
function normalizeCat(key, val) {
  if (typeof val === 'string') return { key, label: key, color: val };
  if (Array.isArray(val)) {
    const [label, color, icon] = val;
    return { key, label: label || key, color, icon };
  }
  if (val && typeof val === 'object') {
    return {
      key,
      label: val.label || val.name || val.title || key,
      color: val.color || val.boja || val.c,
      icon: val.icon || val.emoji || val.ikona,
    };
  }
  return { key, label: key };
}

/** Normalizuj jednu karticu iz CARDS (toleriše više imena polja). */
function normalizeCard(raw) {
  const cat = raw.cat ?? raw.category ?? raw.kat ?? raw.c;
  const title = raw.title ?? raw.t ?? raw.naslov;
  const text = raw.text ?? raw.txt ?? raw.body ?? raw.tekst ?? '';
  const quiz = raw.quiz ?? raw.kviz ?? (raw.q && raw.opts ? { q: raw.q, opts: raw.opts, ok: raw.ok, expl: raw.expl } : null);
  let type = raw.type ?? raw.tip;
  if (!type) type = quiz ? 'quiz' : raw.book ? 'book' : 'lesson';
  return {
    cat: cat ? String(cat) : null,
    type: ['lesson', 'fact', 'quiz', 'book'].includes(type) ? type : quiz ? 'quiz' : 'lesson',
    title: title ? String(title) : null,
    text: String(text),
    quiz: quiz || null,
    book: raw.book ?? raw.knjiga ?? null,
  };
}

/**
 * @returns {{cats: {key,label,color,icon}[], cards: {cat,type,title,text,quiz,book}[]}}
 */
export function parsePrototype(htmlPath) {
  const src = fs.readFileSync(htmlPath, 'utf8');
  const rawCats = extractVariable(src, 'CATS');
  const rawCards = extractVariable(src, 'CARDS');
  const cats = Object.entries(rawCats).map(([k, v]) => normalizeCat(k, v));
  const cards = (Array.isArray(rawCards) ? rawCards : [])
    .map(normalizeCard)
    .filter((c) => c.title && (c.text || c.quiz));
  return { cats, cards };
}
