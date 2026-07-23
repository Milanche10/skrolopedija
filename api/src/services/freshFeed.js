import { prisma } from '../lib/prisma.js';
import { generateCategoryCards, generateWowCards } from './cardGen.js';
import { hasAI } from '../lib/llm.js';
import { categoryWeights, weightedPick } from './adaptive.js';

let counter = 0;

/**
 * Generiše sveže AI kartice za feed — EFEMERNE (ne upisuju se u bazu).
 * Bira jednu nasumičnu aktivnu kategoriju (osim „knjige") iz izbora korisnika,
 * i izbegava naslove koji već postoje ili su nedavno viđeni (`avoid`).
 * Na svaku grešku / iscrpljen AI limit vraća [] — feed nastavlja sa postojećim karticama.
 */
export async function generateFreshCards({ categoryIds = [], count = 4, avoid = [], wow = false, userId = null, allowedKeys = null }) {
  if (!hasAI()) return [];
  const where = { isActive: true, key: { not: 'knjige' } };
  // obični korisnici: generiši samo iz dozvoljenih oblasti (moderator+ → allowedKeys null → sve osim knjiga)
  if (allowedKeys) where.key = { in: allowedKeys };
  if (categoryIds.length) where.id = { in: categoryIds.filter((n) => Number.isInteger(n) && n > 0) };
  const pool = await prisma.category.findMany({ where });
  if (!pool.length) return [];

  // adaptivno: kategorije koje korisnik slabije zna dobijaju veću šansu
  const weights = await categoryWeights(userId);
  const cat = weightedPick(pool, (c) => weights.get(c.id) ?? 1);
  const existing = await prisma.card.findMany({ where: { categoryId: cat.id }, select: { title: true } });
  const avoidTitles = [...existing.map((c) => c.title), ...avoid].slice(-250);

  let cards;
  try {
    cards = wow
      ? await generateWowCards(cat, avoidTitles, count)
      : await generateCategoryCards(cat, avoidTitles, count);
  } catch (err) {
    console.warn(`Sveže generisanje (kat ${cat.key}, wow=${wow}) nije uspelo:`, err.message);
    return [];
  }

  return cards.map((c) => ({
    id: `gen_${Date.now()}_${counter++}`,
    type: c.type,
    title: c.title,
    text: c.text,
    quiz: null,
    source: 'ai',
    sourceRef: null,
    ephemeral: true,
    wow: Boolean(wow),
    categoryId: cat.id,
    category: { id: cat.id, key: cat.key, label: cat.label, color: cat.color, icon: cat.icon },
    book: null,
    saved: false,
    seen: false,
  }));
}
