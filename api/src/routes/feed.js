import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/errors.js';

const router = Router();

const QUIZ_INTERVAL = 9; // svaka 9. kartica je kviz (otprilike 8–10 po specifikaciji)
const FILTERS = ['all', 'saved', 'books', 'quizzes'];

/**
 * GET /feed?categories=1,2&filter=all|saved|books|quizzes&seed=abc&cursor=0&limit=10
 *
 * Algoritam: neviđene kartice pre viđenih, unutar toga deterministički promešano
 * po seed-u (md5(id||seed)) — isti seed daje stabilan redosled za paginaciju,
 * novi seed (pull-to-refresh) promeša feed. Kviz se ubacuje na svaku 9. poziciju.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const cursor = Math.max(Number(req.query.cursor) || 0, 0);
    const seed = String(req.query.seed || 'skrol');
    const filter = String(req.query.filter || 'all');
    if (!FILTERS.includes(filter)) throw new HttpError(400, `filter mora biti: ${FILTERS.join(', ')}`);
    const catIds = String(req.query.categories || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);

    const conds = [Prisma.sql`c."isActive" = true`, Prisma.sql`cat."isActive" = true`];
    if (catIds.length) conds.push(Prisma.sql`c."categoryId" IN (${Prisma.join(catIds)})`);
    if (filter === 'saved') conds.push(Prisma.sql`sv."cardId" IS NOT NULL`);
    if (filter === 'books') conds.push(Prisma.sql`c."bookId" IS NOT NULL`);
    const baseWhere = Prisma.join(conds, ' AND ');

    const fetchIds = async (typeCond, offset, take) => {
      if (take <= 0) return [];
      const rows = await prisma.$queryRaw`
        SELECT c.id FROM "Card" c
        JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "SeenCard" sn ON sn."cardId" = c.id
        LEFT JOIN "SavedCard" sv ON sv."cardId" = c.id
        WHERE ${baseWhere} AND ${typeCond}
        ORDER BY (sn."cardId" IS NULL) DESC, md5(c.id::text || ${seed})
        OFFSET ${offset} LIMIT ${take}`;
      return rows.map((r) => r.id);
    };
    const countWhere = async (typeCond) => {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS n FROM "Card" c
        JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "SavedCard" sv ON sv."cardId" = c.id
        WHERE ${baseWhere} AND ${typeCond}`;
      return rows[0]?.n ?? 0;
    };

    const quizCond = Prisma.sql`c.type = 'quiz'`;
    const mainCond = Prisma.sql`c.type <> 'quiz'`;
    const anyCond = Prisma.sql`TRUE`;

    let orderedIds = [];
    let total = 0;

    if (filter === 'quizzes') {
      total = await countWhere(quizCond);
      orderedIds = await fetchIds(quizCond, cursor, limit);
    } else if (filter === 'saved') {
      total = await countWhere(anyCond);
      orderedIds = await fetchIds(anyCond, cursor, limit);
    } else {
      const [totalMain, totalQuiz] = await Promise.all([countWhere(mainCond), countWhere(quizCond)]);
      total = totalMain + totalQuiz;
      const quizzesBefore = Math.floor(cursor / QUIZ_INTERVAL);
      const mainBefore = cursor - quizzesBefore;
      let quizNeeded = 0;
      for (let p = cursor; p < cursor + limit; p++) {
        if ((p + 1) % QUIZ_INTERVAL === 0) quizNeeded++;
      }
      const [mainIds, quizIds] = await Promise.all([
        fetchIds(mainCond, mainBefore, limit), // višak služi kao dopuna ako nema kvizova
        fetchIds(quizCond, quizzesBefore, quizNeeded),
      ]);
      let mi = 0;
      let qi = 0;
      for (let p = cursor; p < cursor + limit; p++) {
        const wantQuiz = (p + 1) % QUIZ_INTERVAL === 0;
        if (wantQuiz && qi < quizIds.length) orderedIds.push(quizIds[qi++]);
        else if (mi < mainIds.length) orderedIds.push(mainIds[mi++]);
        else if (qi < quizIds.length) orderedIds.push(quizIds[qi++]);
        else break;
      }
    }

    const cards = await prisma.card.findMany({
      where: { id: { in: orderedIds } },
      include: {
        category: { select: { id: true, key: true, label: true, color: true, icon: true } },
        book: { select: { id: true, title: true, author: true } },
        saved: true,
        seen: true,
      },
    });
    const byId = new Map(cards.map((c) => [c.id, c]));
    const items = orderedIds
      .filter((id) => byId.has(id))
      .map((id) => {
        const c = byId.get(id);
        return {
          id: c.id,
          type: c.type,
          title: c.title,
          text: c.text,
          quiz: c.quiz,
          source: c.source,
          sourceRef: c.sourceRef,
          category: c.category,
          book: c.book,
          saved: Boolean(c.saved),
          seen: Boolean(c.seen),
        };
      });

    const nextCursor = cursor + items.length;
    res.json({ items, nextCursor, hasMore: nextCursor < total && items.length > 0, total });
  })
);

export default router;
