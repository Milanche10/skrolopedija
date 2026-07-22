import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { requireUser } from '../lib/auth.js';
import { computeStats } from '../services/gamification.js';
import { dueReviewCount } from '../services/review.js';

const router = Router();
router.use(requireUser); // sve korisničko stanje traži prijavu (gost nema napredak)

async function getState(userId) {
  let state = await prisma.userState.findUnique({ where: { userId } });
  if (!state) state = await prisma.userState.create({ data: { userId } });
  return state;
}

// Dan se računa u vremenskoj zoni korisnika (ne UTC servera).
const TZ = process.env.APP_TIMEZONE || 'Europe/Belgrade';
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayString = (d) => dayFmt.format(d);

// Gejmifikacija: XP, nivo, bedževi, DNA, Knowledge heatmap
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await computeStats(req.user.id));
  })
);

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const state = await getState(uid);
    const [savedIds, seenCount, quizTotal, quizCorrect, reviewDue] = await Promise.all([
      prisma.savedCard.findMany({ where: { userId: uid }, select: { cardId: true } }),
      prisma.seenCard.count({ where: { userId: uid } }),
      prisma.quizAnswer.count({ where: { userId: uid } }),
      prisma.quizAnswer.count({ where: { userId: uid, correct: true } }),
      dueReviewCount(uid),
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
    const uid = req.user.id;
    const state = await getState(uid);
    const now = new Date();
    const today = dayString(now);
    const last = state.lastVisit ? dayString(state.lastVisit) : null;
    let count = state.streakCount;
    if (last !== today) {
      const yesterday = dayString(new Date(now.getTime() - 86400000));
      count = last === yesterday ? count + 1 : 1;
      await prisma.userState.update({ where: { userId: uid }, data: { streakCount: count, lastVisit: now } });
    }
    res.json({ count, lastVisit: now });
  })
);

// Zapamti izbor filtera
router.put(
  '/filters',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    await getState(uid);
    const state = await prisma.userState.update({ where: { userId: uid }, data: { filters: req.body ?? {} } });
    res.json({ filters: state.filters });
  })
);

export default router;
