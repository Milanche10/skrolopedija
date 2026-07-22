import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { computeStats } from '../services/gamification.js';
import { dueReviewCount } from '../services/review.js';

const router = Router();

// Gejmifikacija: XP, nivo, bedževi, Knowledge heatmap (računato iz aktivnosti).
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await computeStats());
  })
);

async function getState() {
  let state = await prisma.userState.findUnique({ where: { id: 1 } });
  if (!state) state = await prisma.userState.create({ data: { id: 1 } });
  return state;
}

// Dan se računa u vremenskoj zoni korisnika (ne UTC servera) — inače se streak
// pogrešno resetuje/uvećava oko lokalne ponoći kad server radi u UTC (Render).
const TZ = process.env.APP_TIMEZONE || 'Europe/Belgrade';
const dayFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dayString(d) {
  return dayFmt.format(d); // YYYY-MM-DD u zoni TZ
}

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    const state = await getState();
    const [savedIds, seenCount, quizTotal, quizCorrect, reviewDue] = await Promise.all([
      prisma.savedCard.findMany({ select: { cardId: true } }),
      prisma.seenCard.count(),
      prisma.quizAnswer.count(),
      prisma.quizAnswer.count({ where: { correct: true } }),
      dueReviewCount(),
    ]);
    res.json({
      streak: { count: state.streakCount, lastVisit: state.lastVisit },
      filters: state.filters,
      savedIds: savedIds.map((s) => s.cardId),
      seenCount,
      quiz: { total: quizTotal, correct: quizCorrect },
      reviewDue,
    });
  })
);

// Registruj dnevnu posetu → streak logika
router.post(
  '/visit',
  asyncHandler(async (req, res) => {
    const state = await getState();
    const now = new Date();
    const today = dayString(now);
    const last = state.lastVisit ? dayString(state.lastVisit) : null;
    let count = state.streakCount;
    if (last !== today) {
      const yesterday = dayString(new Date(now.getTime() - 86400000));
      count = last === yesterday ? count + 1 : 1;
      await prisma.userState.update({ where: { id: 1 }, data: { streakCount: count, lastVisit: now } });
    }
    res.json({ count, lastVisit: now });
  })
);

// Zapamti izbor filtera (kategorije + režim)
router.put(
  '/filters',
  asyncHandler(async (req, res) => {
    await getState();
    const state = await prisma.userState.update({
      where: { id: 1 },
      data: { filters: req.body ?? {} },
    });
    res.json({ filters: state.filters });
  })
);

export default router;
