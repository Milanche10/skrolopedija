import { prisma } from '../lib/prisma.js';

/**
 * Težina kategorije za adaptivni feed: veća = korisnik slabije poznaje temu
 * (više „ne razumem" / pogrešnih kvizova) → generiši/prikaži je češće.
 * Bazira se na CardSignal zapisima (swipe + kviz signali).
 */
export async function categoryWeights(userId) {
  const rows = await prisma.cardSignal.groupBy({
    by: ['categoryId', 'kind'],
    where: userId ? { userId } : undefined,
    _count: { _all: true },
  });
  const w = new Map();
  for (const r of rows) {
    const cur = w.get(r.categoryId) ?? 1;
    const n = r._count._all;
    if (r.kind === 'dont_know') w.set(r.categoryId, cur + n * 0.6);
    else if (r.kind === 'know') w.set(r.categoryId, cur - n * 0.25);
    // "skip" ne menja težinu
  }
  // pod na 0.25 da kategorija koju „znaš" ne nestane sasvim
  for (const [k, v] of w) w.set(k, Math.max(0.25, v));
  return w;
}

/** Ponderisan izbor jednog elementa iz niza (weightOf vraća pozitivnu težinu). */
export function weightedPick(items, weightOf, rand = Math.random()) {
  if (!items.length) return null;
  const weights = items.map((it) => Math.max(0.0001, weightOf(it)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let t = rand * sum;
  for (let i = 0; i < items.length; i++) {
    t -= weights[i];
    if (t <= 0) return items[i];
  }
  return items[items.length - 1];
}
