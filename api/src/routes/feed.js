import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/errors.js';
import { generateFreshCards } from '../services/freshFeed.js';
import { generateDeeperCards } from '../services/cardGen.js';
import { hasAI } from '../lib/llm.js';

const router = Router();

let deeperCounter = 0;

/**
 * POST /feed/deeper { cardId?, title, text, categoryId, count }
 * „Saznaj više" — dublje efemerne kartice o konkretnoj temi date kartice.
 */
router.post(
  '/deeper',
  asyncHandler(async (req, res) => {
    if (!hasAI()) return res.json({ items: [] });
    if (!req.body?.title || !req.body?.text) throw new HttpError(400, 'title i text su obavezni');
    const categoryId = Number(req.body.categoryId) || null;
    const cat = categoryId ? await prisma.category.findUnique({ where: { id: categoryId } }) : null;
    const count = Math.min(Math.max(Number(req.body?.count) || 4, 1), 6);
    let cards;
    try {
      cards = await generateDeeperCards({
        title: String(req.body.title),
        text: String(req.body.text),
        categoryLabel: cat?.label || 'opšte',
        count,
      });
    } catch (err) {
      console.warn('Deeper generisanje nije uspelo:', err.message);
      return res.json({ items: [] });
    }
    const items = cards.map((c) => ({
      id: `gen_deep_${Date.now()}_${deeperCounter++}`,
      type: c.type,
      title: c.title,
      text: c.text,
      quiz: null,
      source: 'ai',
      sourceRef: null,
      ephemeral: true,
      deeper: true,
      categoryId: cat?.id ?? null,
      category: cat ? { id: cat.id, key: cat.key, label: cat.label, color: cat.color, icon: cat.icon } : req.body.category || null,
      book: null,
      saved: false,
      seen: false,
    }));
    res.json({ items });
  })
);

/**
 * POST /feed/fresh { categories:[ids], count, avoid:[titles] }
 * Vraća sveže AI-generisane EFEMERNE kartice (nisu u bazi dok se ne sačuvaju).
 */
router.post(
  '/fresh',
  asyncHandler(async (req, res) => {
    const categories = Array.isArray(req.body?.categories) ? req.body.categories.map(Number) : [];
    const count = Math.min(Math.max(Number(req.body?.count) || 4, 1), 8);
    const avoid = Array.isArray(req.body?.avoid) ? req.body.avoid.map(String).slice(0, 120) : [];
    const wow = Boolean(req.body?.wow);
    const items = await generateFreshCards({ categoryIds: categories, count, avoid, wow });
    res.json({ items });
  })
);

const QUIZ_INTERVAL = 9; // svaka 9. kartica je kviz (otprilike 8–10 po specifikaciji)
const FILTERS = ['all', 'saved', 'books', 'quizzes', 'review'];

/**
 * Kursor je kompozitan ("<mainOffset>-<quizOffset>") jer se dva toka (obične
 * kartice i kvizovi) troše različitom brzinom — posebno kad kvizova nestane
 * pa se pozicija kviza popuni običnom karticom. Goli broj se prihvata radi
 * kompatibilnosti i tretira kao main offset.
 */
function parseCursor(raw) {
  const s = String(raw ?? '0');
  const m = s.match(/^(\d+)-(\d+)$/);
  if (m) return { main: Number(m[1]), quiz: Number(m[2]) };
  const n = Math.max(Number(s) || 0, 0);
  return { main: n, quiz: 0 };
}

/**
 * GET /feed?categories=1,2&filter=all|saved|books|quizzes&seed=abc&cursor=0-0&limit=10&since=ISO
 *
 * Algoritam: neviđene kartice pre viđenih, unutar toga deterministički promešano
 * po seed-u (md5(id||seed)). `since` je početak sesije na klijentu — kartice
 * viđene TOKOM ove sesije zadržavaju svoj "neviđen" slot, pa je redosled stabilan
 * kroz stranice iako klijent usput markira viđeno. Kviz ide na svaku 9. poziciju.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const cur = parseCursor(req.query.cursor);
    const seed = String(req.query.seed || 'skrol');
    const filter = String(req.query.filter || 'all');
    if (!FILTERS.includes(filter)) throw new HttpError(400, `filter mora biti: ${FILTERS.join(', ')}`);
    const catIds = String(req.query.categories || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    let since = null;
    if (req.query.since) {
      const d = new Date(String(req.query.since));
      if (!Number.isNaN(d.getTime())) since = d;
    }

    const conds = [Prisma.sql`c."isActive" = true`, Prisma.sql`cat."isActive" = true`];
    if (catIds.length) conds.push(Prisma.sql`c."categoryId" IN (${Prisma.join(catIds)})`);
    if (filter === 'saved') conds.push(Prisma.sql`sv."cardId" IS NOT NULL`);
    if (filter === 'books') conds.push(Prisma.sql`c."bookId" IS NOT NULL`);
    const baseWhere = Prisma.join(conds, ' AND ');

    // kartice viđene pre početka sesije idu na kraj; one viđene tokom sesije
    // ostaju u "neviđenoj" grupi da se redosled ne pomera između stranica
    const unseenExpr = since
      ? Prisma.sql`(sn."cardId" IS NULL OR sn."seenAt" >= ${since})`
      : Prisma.sql`(sn."cardId" IS NULL)`;

    const fetchIds = async (typeCond, offset, take) => {
      if (take <= 0) return [];
      const rows = await prisma.$queryRaw`
        SELECT c.id FROM "Card" c
        JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "SeenCard" sn ON sn."cardId" = c.id
        LEFT JOIN "SavedCard" sv ON sv."cardId" = c.id
        WHERE ${baseWhere} AND ${typeCond}
        ORDER BY ${unseenExpr} DESC, md5(c.id::text || ${seed})
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
    let nextCursor;

    if (filter === 'review') {
      // spaced repetition: kartice na redu za ponavljanje, poređane po roku (dueAt)
      const offset = cur.main + cur.quiz;
      const cRows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS n FROM "Card" c
        JOIN "Category" cat ON cat.id = c."categoryId"
        JOIN "ReviewState" rv ON rv."cardId" = c.id
        WHERE ${baseWhere} AND rv."dueAt" <= NOW()`;
      total = cRows[0]?.n ?? 0;
      const rows = await prisma.$queryRaw`
        SELECT c.id FROM "Card" c
        JOIN "Category" cat ON cat.id = c."categoryId"
        JOIN "ReviewState" rv ON rv."cardId" = c.id
        WHERE ${baseWhere} AND rv."dueAt" <= NOW()
        ORDER BY rv."dueAt" ASC
        OFFSET ${offset} LIMIT ${limit}`;
      orderedIds = rows.map((r) => r.id);
      nextCursor = `${offset + orderedIds.length}-0`;
    } else if (filter === 'quizzes' || filter === 'saved') {
      // jedan tok, bez ubacivanja
      const cond = filter === 'quizzes' ? quizCond : anyCond;
      const offset = cur.main + cur.quiz;
      total = await countWhere(cond);
      orderedIds = await fetchIds(cond, offset, limit);
      nextCursor = `${offset + orderedIds.length}-0`;
    } else {
      const [totalMain, totalQuiz] = await Promise.all([countWhere(mainCond), countWhere(quizCond)]);
      total = totalMain + totalQuiz;
      const globalStart = cur.main + cur.quiz;
      let quizWanted = 0;
      for (let p = globalStart; p < globalStart + limit; p++) {
        if ((p + 1) % QUIZ_INTERVAL === 0) quizWanted++;
      }
      // oba toka dohvatamo do `limit` — višak služi kao dopuna kad drugi tok presuši
      const [mainIds, quizIds] = await Promise.all([
        fetchIds(mainCond, cur.main, limit),
        fetchIds(quizCond, cur.quiz, Math.min(limit, Math.max(quizWanted, 1))),
      ]);
      let mi = 0;
      let qi = 0;
      for (let p = globalStart; p < globalStart + limit; p++) {
        const wantQuiz = (p + 1) % QUIZ_INTERVAL === 0;
        if (wantQuiz && qi < quizIds.length) orderedIds.push(quizIds[qi++]);
        else if (mi < mainIds.length) orderedIds.push(mainIds[mi++]);
        else if (qi < quizIds.length) orderedIds.push(quizIds[qi++]);
        else break;
      }
      // kursor pamti koliko je STVARNO potrošeno iz svakog toka
      nextCursor = `${cur.main + mi}-${cur.quiz + qi}`;
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

    const consumed = nextCursor.split('-').reduce((s, n) => s + Number(n), 0);
    res.json({ items, nextCursor, hasMore: items.length > 0 && consumed < total, total });
  })
);

export default router;
