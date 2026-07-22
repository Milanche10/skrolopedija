import { prisma } from '../lib/prisma.js';

const DAY = 86400000;

/**
 * SM-2-lite: ažuriraj raspored ponavljanja kartice posle odgovora na kviz.
 * Tačno → interval raste (1, 3, pa ×ease dana). Netačno → vraća se za ~10 min.
 */
export async function updateReview(cardId, correct) {
  const cur = await prisma.reviewState.findUnique({ where: { cardId } });
  let ease = cur?.ease ?? 2.5;
  let reps = cur?.reps ?? 0;
  let interval = cur?.intervalDays ?? 0;
  let lapses = cur?.lapses ?? 0;

  if (correct) {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.max(1, Math.round(interval * ease));
    ease = Math.min(3.0, ease + 0.1);
  } else {
    reps = 0;
    lapses += 1;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  }
  const dueAt = new Date(Date.now() + (correct ? interval * DAY : 10 * 60000));
  await prisma.reviewState.upsert({
    where: { cardId },
    update: { ease, intervalDays: interval, reps, lapses, dueAt },
    create: { cardId, ease, intervalDays: interval, reps, lapses, dueAt },
  });
}

/** Broj kartica koje su „na redu" za ponavljanje (dueAt <= sada). */
export function dueReviewCount() {
  return prisma.reviewState.count({ where: { dueAt: { lte: new Date() } } });
}
