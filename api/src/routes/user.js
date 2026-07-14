import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';

const router = Router();

async function getState() {
  let state = await prisma.userState.findUnique({ where: { id: 1 } });
  if (!state) state = await prisma.userState.create({ data: { id: 1 } });
  return state;
}

function dayString(d) {
  return d.toISOString().slice(0, 10);
}

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    const state = await getState();
    const [savedIds, seenCount, quizTotal, quizCorrect] = await Promise.all([
      prisma.savedCard.findMany({ select: { cardId: true } }),
      prisma.seenCard.count(),
      prisma.quizAnswer.count(),
      prisma.quizAnswer.count({ where: { correct: true } }),
    ]);
    res.json({
      streak: { count: state.streakCount, lastVisit: state.lastVisit },
      filters: state.filters,
      savedIds: savedIds.map((s) => s.cardId),
      seenCount,
      quiz: { total: quizTotal, correct: quizCorrect },
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
