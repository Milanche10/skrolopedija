import { prisma } from '../lib/prisma.js';
import { generateCategoryCards } from './cardGen.js';
import { hasAI } from '../lib/llm.js';

let counter = 0;

/**
 * Generiše sveže AI kartice za feed — EFEMERNE (ne upisuju se u bazu).
 * Bira jednu nasumičnu aktivnu kategoriju (osim „knjige") iz izbora korisnika,
 * i izbegava naslove koji već postoje ili su nedavno viđeni (`avoid`).
 * Na svaku grešku / iscrpljen AI limit vraća [] — feed nastavlja sa postojećim karticama.
 */
export async function generateFreshCards({ categoryIds = [], count = 4, avoid = [] }) {
  if (!hasAI()) return [];
  const where = { isActive: true, key: { not: 'knjige' } };
  if (categoryIds.length) where.id = { in: categoryIds.filter((n) => Number.isInteger(n) && n > 0) };
  const pool = await prisma.category.findMany({ where });
  if (!pool.length) return [];

  const cat = pool[Math.floor(Math.random() * pool.length)];
  const existing = await prisma.card.findMany({ where: { categoryId: cat.id }, select: { title: true } });
  const avoidTitles = [...existing.map((c) => c.title), ...avoid].slice(-250);

  let cards;
  try {
    cards = await generateCategoryCards(cat, avoidTitles, count);
  } catch (err) {
    console.warn(`Sveže generisanje (kat ${cat.key}) nije uspelo:`, err.message);
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
    categoryId: cat.id,
    category: { id: cat.id, key: cat.key, label: cat.label, color: cat.color, icon: cat.icon },
    book: null,
    saved: false,
    seen: false,
  }));
}
