import { callLLM, extractJson, GEN_MODEL } from '../lib/llm.js';

const CARD_RULES = `Pravila za kartice:
- Sav tekst na srpskom jeziku, LATINICA (ekavica), gramatički ispravno i prirodno.
- "title": kratak, konkretan naslov (do 60 znakova), bez uopštenih fraza tipa "Zanimljivost" ili "Lekcija 1".
- "text": 3–5 punih rečenica (najmanje 200 znakova), jasno i samostalno razumljivo — čitalac pamti jednu konkretnu ideju.
- "type": tačno "lesson" (lekcija/tehnika/princip) ili "fact" (zanimljiva činjenica).
- KVALITET IZNAD KOLIČINE: napravi karticu SAMO ako nosi zaokruženu, vrednu ideju. Radije vrati manje kartica nego prazne/uopštene.
- Preskoči sve što nije samo po sebi lekcija: sadržaj, predgovor, posvete, zahvalnice, imena poglavlja, nabrajanja bez objašnjenja, „autor kaže…" bez suštine.
- Nikad ne kopiraj tekst izvora — uvek parafraziraj svojim rečima.
- Samo činjenično tačno; ako nisi siguran u podatak, izostavi ga. Ne izmišljaj brojeve, imena ni citate.
- Vrati ISKLJUČIVO JSON objekat oblika: {"cards": [ {"title": "...", "text": "...", "type": "lesson"}, ... ]}. Bez teksta pre ili posle.`;

const QUIZ_RULES = `Kviz kartica je JSON objekat: {"title": "...", "quiz": {"q": "pitanje", "opts": ["A","B","C","D"], "ok": <indeks tačnog 0-3>, "expl": "objašnjenje u 1-2 rečenice"}}. Sve na srpskom, latinica.`;

// Uzmi prvu ne-praznu vrednost iz više mogućih imena polja (modeli variraju,
// slabiji modeli često vrate srpska imena: naslov/tekst umesto title/text).
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// Različiti modeli (Ollama u json režimu) umeju da umotaju niz u objekat —
// prihvati niz direktno, ili {cards:[...]}, {kartice/karte:[...]}, ili prvi niz u objektu.
export function asCardArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const named = pick(parsed, 'cards', 'kartice', 'karte', 'items', 'lekcije');
    if (Array.isArray(named)) return named;
    const firstArr = Object.values(parsed).find((v) => Array.isArray(v));
    if (firstArr) return firstArr;
    // model je vratio jednu karticu kao objekat — umotaj u niz
    if (pick(parsed, 'title', 'naslov') && pick(parsed, 'text', 'tekst')) return [parsed];
  }
  return [];
}

// Naslovi koji su prazna forma, ne prava lekcija — odbaci ih.
const GENERIC_TITLE = /^(lekcija|kartica|zanimljivost|fact|lesson|uvod|zaključak|poglavlje|deo)\s*\d*[:.\s]*$/i;

export function cleanCards(arr) {
  const seen = new Set();
  return arr
    .map((c) => ({
      title: String(pick(c, 'title', 'naslov', 'naziv') || '').trim(),
      text: String(pick(c, 'text', 'tekst', 'sadrzaj', 'sadržaj', 'opis') || '').trim(),
      type: pick(c, 'type', 'tip') === 'fact' ? 'fact' : 'lesson',
    }))
    .filter((c) => {
      // filter kvaliteta: samo kartice koje "imaju smisla"
      if (!c.title || !c.text) return false;
      if (c.title.length < 3 || c.title.length > 120) return false;
      if (c.text.length < 120) return false; // prekratko = nije zaokružena lekcija
      if (GENERIC_TITLE.test(c.title)) return false;
      if (!/[.!?]/.test(c.text)) return false; // nema nijedne cele rečenice
      const key = c.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false; // duplikat unutar iste serije
      seen.add(key);
      return true;
    });
}

// Normalizuj kviz iz modela (toleriše srpska imena polja).
export function normalizeQuiz(obj) {
  const quiz = obj?.quiz || obj?.kviz || obj;
  if (!quiz) return null;
  const q = pick(quiz, 'q', 'pitanje', 'question');
  const opts = pick(quiz, 'opts', 'opcije', 'odgovori', 'options');
  let ok = pick(quiz, 'ok', 'tacan', 'tačan', 'correct', 'answer');
  const expl = pick(quiz, 'expl', 'objasnjenje', 'objašnjenje', 'explanation') || '';
  if (!q || !Array.isArray(opts) || opts.length < 2) return null;
  ok = Number(ok);
  if (!Number.isInteger(ok) || ok < 0 || ok >= opts.length) return null;
  return { title: pick(obj, 'title', 'naslov') || String(q), quiz: { q: String(q), opts: opts.map(String), ok, expl: String(expl) } };
}

/**
 * Generiši N novih kartica za kategoriju, izbegavajući postojeće naslove.
 */
export async function generateCategoryCards(category, existingTitles, count = 5) {
  const system = `Ti si stručni autor mikro-lekcija za aplikaciju Skrolopedija (učenje kroz skrolovanje). ${CARD_RULES}`;
  const user = `Kategorija: "${category.label}".
Napiši tačno ${count} novih kartica za ovu kategoriju. Pokrij raznovrsne podteme, konkretne i praktične gde ima smisla.
${technicalGuidance(category.key)}
Postojeći naslovi u kategoriji (NE ponavljaj ove teme):
${existingTitles.slice(0, 120).map((t) => `- ${t}`).join('\n') || '(nema)'}

Vrati JSON: {"cards": [ ${count} objekata oblika {"title","text","type"} ]}.`;
  const raw = await callLLM({ system, user, maxTokens: 8000 });
  const cards = cleanCards(asCardArray(extractJson(raw)));
  if (!cards.length) throw new Error('Model nije vratio nijednu ispravnu karticu');
  return cards;
}

function technicalGuidance(key) {
  const map = {
    'sajber-bezbednost':
      'Fokus: vrste napada (phishing, malver, ransomware), odbrana, socijalni inženjering, dobre prakse (lozinke, 2FA, ažuriranja). Tehnički tačno, ali razumljivo laiku.',
    'digitalna-forenzika':
      'Fokus: metodologija istrage, digitalni artefakti (logovi, registry, keš), lanac dokaza (chain of custody), forenzički alati i tehnike. Tehnički tačno.',
    'racunarske-mreze':
      'Fokus: OSI i TCP/IP modeli, protokoli (HTTP, TCP, UDP, IP), rutiranje, DNS, bežične mreže. Tehnički tačno, sa konkretnim primerima.',
    internet:
      'Fokus: kako web radi (browser → server), istorija interneta, infrastruktura (kablovi, IXP, CDN), privatnost na mreži.',
  };
  return map[key] || '';
}

/**
 * Iz segmenta knjige izvuci SVE vredne lekcije kao kartice.
 */
export async function segmentToCards({ bookTitle, author, segmentText, model = GEN_MODEL }) {
  const system = `Ti si stručni ekstraktor znanja za aplikaciju Skrolopedija. Iz datog odlomka knjige izvlačiš SVE vredne lekcije, tehnike, principe, priče i primere — svaki kao zasebnu karticu.
${CARD_RULES}
Dodatna pravila za knjige:
- Budi ISCRPAN: iz odlomka izvuci svaku vrednu ideju (obično 3–10 kartica po odlomku, koliko god materijal nosi). Ne preskači primere i anegdote — one su često najpamtljivije.
- Autorska prava: strogo parafraziraj, nikad ne prenosi rečenice iz knjige doslovno.
- Etika: ako knjiga opisuje tehnike obmane ili manipulacije ljudima, tu tehniku PRESKOČI ili je preformuliši u konstruktivnu, etičku lekciju (npr. razumevanje tuđe perspektive, građenje poverenja). Ne pravi kartice koje uče čitaoca da vara ili manipuliše.
- Ako odlomak nema vrednog sadržaja (sadržaj, indeks, zahvalnice), vrati prazan niz [].`;
  const user = `Knjiga: "${bookTitle}"${author ? `, autor: ${author}` : ''}.
Odlomak:
"""
${segmentText}
"""
Vrati JSON: {"cards": [ objekti {"title","text","type"} za sve vredne kartice iz ovog odlomka ]}. Ako nema vrednog sadržaja: {"cards": []}.`;
  const raw = await callLLM({ system, user, model, maxTokens: 8000 });
  return cleanCards(asCardArray(extractJson(raw)));
}

/**
 * Napravi jednu kviz karticu iz nedavnih lekcija knjige.
 */
export async function quizFromLessons({ bookTitle, lessons }) {
  const system = `Ti si autor kviz pitanja za aplikaciju Skrolopedija. ${QUIZ_RULES} Vrati ISKLJUČIVO JSON objekat.`;
  const user = `Iz sledećih lekcija iz knjige "${bookTitle}" napravi JEDNO dobro kviz pitanje sa 4 ponuđena odgovora (samo jedan tačan):
${lessons.map((l) => `- ${l.title}: ${l.text}`).join('\n')}`;
  const raw = await callLLM({ system, user, maxTokens: 1500 });
  const q = normalizeQuiz(extractJson(raw));
  if (!q) throw new Error('Neispravna kviz kartica iz modela');
  return q;
}

/**
 * Iz sirovog web teksta (Wikipedia) napravi kartice.
 */
export async function webTextToCards({ category, rawText, sourceUrl, count = 3 }) {
  const system = `Ti si stručni autor mikro-lekcija za aplikaciju Skrolopedija. ${CARD_RULES}
- Radiš sa sirovim tekstom sa interneta — izvuci najzanimljivije i najkorisnije, parafrazirano.`;
  const user = `Kategorija: "${category.label}". Izvor: ${sourceUrl}
Sirovi tekst:
"""
${rawText.slice(0, 12000)}
"""
Vrati JSON: {"cards": [ do ${count} objekata {"title","text","type"} iz ovog materijala ]}. Ako nije relevantno: {"cards": []}.`;
  const raw = await callLLM({ system, user, maxTokens: 4000 });
  return cleanCards(asCardArray(extractJson(raw)));
}
