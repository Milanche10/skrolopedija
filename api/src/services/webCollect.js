import { prisma } from '../lib/prisma.js';
import { webTextToCards } from './cardGen.js';
import { isDuplicateTitle } from './dedup.js';

const UA = { headers: { 'User-Agent': 'Skrolopedija/1.0 (edukativna aplikacija)' } };

/** Mapiranje kategorija na Wikipedia pojmove za pretragu srodnih članaka. */
const TOPIC_HINTS = {
  istorija: ['history', 'istorija'],
  kosmos: ['astronomy', 'astronomija', 'svemir'],
  nauka: ['science', 'nauka'],
  psihologija: ['psychology', 'psihologija'],
  filozofija: ['philosophy', 'filozofija'],
  geografija: ['geography', 'geografija'],
  zivotinje: ['zoology', 'životinje'],
  dinosaurusi: ['dinosaur', 'dinosaurusi'],
  mitologija: ['mythology', 'mitologija'],
  'ljudsko-telo': ['human anatomy', 'anatomija čoveka'],
  prezivljavanje: ['survival skills', 'preživljavanje'],
  'sajber-bezbednost': ['computer security', 'informatička bezbednost'],
  internet: ['internet', 'world wide web'],
  'digitalna-forenzika': ['digital forensics', 'digitalna forenzika'],
  'racunarske-mreze': ['computer network', 'računarska mreža'],
};

async function fetchJson(url) {
  const res = await fetch(url, UA);
  if (!res.ok) throw new Error(`Wikipedia ${res.status} za ${url}`);
  return res.json();
}

/** "Na današnji dan" (sr, pa en fallback) — za kategoriju Istorija. */
async function onThisDay() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  for (const lang of ['sr', 'en']) {
    try {
      const data = await fetchJson(
        `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`
      );
      const events = (data.events || []).slice(0, 12);
      if (events.length) {
        const text = events.map((e) => `${e.year}: ${e.text}`).join('\n');
        return { text, url: `https://${lang}.wikipedia.org/wiki/${mm}-${dd}` };
      }
    } catch {
      /* probaj sledeći jezik */
    }
  }
  return null;
}

/** Pretraži članke po temi i povuci sažetke. */
async function topicArticles(hints) {
  const collected = [];
  for (const lang of ['sr', 'en']) {
    const hint = hints[lang === 'sr' ? 1 : 0] || hints[0];
    try {
      const search = await fetchJson(
        `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(hint)}&limit=5`
      );
      for (const page of search.pages || []) {
        try {
          const sum = await fetchJson(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`
          );
          if (sum.extract && sum.extract.length > 200) {
            collected.push({ text: `${sum.title}\n${sum.extract}`, url: sum.content_urls?.desktop?.page || '' });
          }
        } catch {
          /* preskoči članak */
        }
        if (collected.length >= 4) break;
      }
    } catch {
      /* preskoči jezik */
    }
    if (collected.length >= 4) break;
  }
  // dodaj i po jedan slučajan članak za raznovrsnost
  try {
    const rnd = await fetchJson('https://sr.wikipedia.org/api/rest_v1/page/random/summary');
    if (rnd.extract && rnd.extract.length > 200) {
      collected.push({ text: `${rnd.title}\n${rnd.extract}`, url: rnd.content_urls?.desktop?.page || '' });
    }
  } catch {
    /* nebitno */
  }
  return collected;
}

/**
 * Prikupi sadržaj sa interneta za kategoriju i napravi kartice.
 */
export async function collectForCategory(categoryId, maxCards = 6) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw Object.assign(new Error('Kategorija ne postoji'), { status: 404 });

  const sources = [];
  if (category.key === 'istorija') {
    const otd = await onThisDay();
    if (otd) sources.push(otd);
  }
  const hints = TOPIC_HINTS[category.key] || [category.label];
  sources.push(...(await topicArticles(hints)));
  if (!sources.length) throw new Error('Nijedan izvor sa Wikipedije nije dostupan');

  const existing = await prisma.card.findMany({
    where: { categoryId },
    select: { title: true },
  });
  const existingTitles = existing.map((c) => c.title);
  const createdCards = [];

  for (const src of sources) {
    if (createdCards.length >= maxCards) break;
    const cards = await webTextToCards({
      category,
      rawText: src.text,
      sourceUrl: src.url,
      count: Math.min(3, maxCards - createdCards.length),
    });
    for (const c of cards) {
      if (createdCards.length >= maxCards) break;
      if (isDuplicateTitle(c.title, existingTitles)) continue;
      existingTitles.push(c.title);
      const card = await prisma.card.create({
        data: {
          categoryId,
          type: c.type,
          title: c.title,
          text: c.text,
          source: 'web',
          sourceRef: src.url || 'Wikipedia',
        },
      });
      createdCards.push(card);
    }
  }
  return createdCards;
}
