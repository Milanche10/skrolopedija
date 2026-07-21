import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, requireFields, intParam } from '../lib/errors.js';
import { explainCard } from '../services/cardGen.js';

const router = Router();

const EXPLAIN_MODES = ['eli10', 'example', 'deeper'];

// AI objašnjenje kartice (jednostavno / primer iz života / dublje).
router.post(
  '/explain',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title', 'text']);
    const mode = EXPLAIN_MODES.includes(req.body.mode) ? req.body.mode : 'eli10';
    const text = await explainCard({ title: String(req.body.title), text: String(req.body.text), mode });
    res.json({ mode, text });
  })
);

const TYPES = ['lesson', 'fact', 'quiz', 'book'];
const SOURCES = ['seed', 'book', 'ai', 'web'];

function validateQuiz(quiz) {
  if (
    !quiz ||
    typeof quiz.q !== 'string' ||
    !Array.isArray(quiz.opts) ||
    quiz.opts.length < 2 ||
    !Number.isInteger(quiz.ok) ||
    quiz.ok < 0 ||
    quiz.ok >= quiz.opts.length
  ) {
    throw new HttpError(400, 'quiz mora biti {q, opts[](≥2), ok(indeks), expl}');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
    const where = {};
    if (req.query.categoryId) where.categoryId = intParam(req.query.categoryId, 'categoryId');
    if (req.query.bookId) where.bookId = intParam(req.query.bookId, 'bookId');
    if (req.query.type) {
      if (!TYPES.includes(req.query.type)) throw new HttpError(400, `type mora biti: ${TYPES.join(', ')}`);
      where.type = req.query.type;
    }
    if (req.query.source) {
      if (!SOURCES.includes(req.query.source)) throw new HttpError(400, `source mora biti: ${SOURCES.join(', ')}`);
      where.source = req.query.source;
    }
    if (req.query.q) {
      where.OR = [
        { title: { contains: String(req.query.q), mode: 'insensitive' } },
        { text: { contains: String(req.query.q), mode: 'insensitive' } },
      ];
    }
    if (req.query.active === '1') where.isActive = true;
    const [total, items] = await Promise.all([
      prisma.card.count({ where }),
      prisma.card.findMany({
        where,
        include: { category: true, book: { select: { id: true, title: true, author: true } } },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ total, page, pageSize, items });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const card = await prisma.card.findUnique({
      where: { id },
      include: { category: true, book: { select: { id: true, title: true, author: true } } },
    });
    if (!card) throw new HttpError(404, 'Kartica ne postoji');
    res.json(card);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['categoryId', 'title']);
    const type = req.body.type || 'lesson';
    if (!TYPES.includes(type)) throw new HttpError(400, `type mora biti: ${TYPES.join(', ')}`);
    if (type === 'quiz') validateQuiz(req.body.quiz);
    else requireFields(req.body, ['text']);
    const categoryId = intParam(req.body.categoryId, 'categoryId');
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new HttpError(400, 'categoryId ne postoji');
    const card = await prisma.card.create({
      data: {
        categoryId,
        bookId: req.body.bookId ?? null,
        type,
        title: req.body.title,
        text: req.body.text || '',
        quiz: req.body.quiz ?? undefined,
        source: SOURCES.includes(req.body.source) ? req.body.source : 'seed',
        sourceRef: req.body.sourceRef ?? null,
        isActive: req.body.isActive ?? true,
      },
    });
    res.status(201).json(card);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    if (req.body.type && !TYPES.includes(req.body.type)) {
      throw new HttpError(400, `type mora biti: ${TYPES.join(', ')}`);
    }
    if (req.body.quiz !== undefined && req.body.quiz !== null) validateQuiz(req.body.quiz);

    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Kartica ne postoji');

    // kartica koja POSLE izmene ima type=quiz mora imati i validan quiz
    const finalType = req.body.type ?? existing.type;
    const finalQuiz = req.body.quiz === undefined ? existing.quiz : req.body.quiz;
    if (finalType === 'quiz' && !finalQuiz) {
      throw new HttpError(400, 'Kviz kartica mora imati quiz polje ({q, opts[], ok, expl})');
    }

    const data = {};
    for (const f of ['categoryId', 'bookId', 'type', 'title', 'text', 'source', 'sourceRef', 'isActive']) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.quiz !== undefined) {
      // goli null nije dozvoljen za Prisma Json polje — mora DbNull
      data.quiz = req.body.quiz === null ? Prisma.DbNull : req.body.quiz;
    }
    const card = await prisma.card.update({ where: { id }, data });
    res.json(card);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    try {
      await prisma.card.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Kartica ne postoji');
      throw err;
    }
    res.json({ ok: true });
  })
);

// --- akcije korisnika na kartici ---

// Adaptivni signal: swipe desno = "know", levo = "dont_know", prolaz = "skip".
const SIGNAL_KINDS = ['know', 'dont_know', 'skip'];
router.post(
  '/signal',
  asyncHandler(async (req, res) => {
    const kind = String(req.body?.kind);
    if (!SIGNAL_KINDS.includes(kind)) throw new HttpError(400, `kind mora biti: ${SIGNAL_KINDS.join(', ')}`);
    const categoryId = intParam(req.body?.categoryId, 'categoryId');
    const dwellMs = Math.max(0, Math.min(Number(req.body?.dwellMs) || 0, 600000));
    const cardId = Number.isInteger(req.body?.cardId) ? req.body.cardId : null;
    await prisma.cardSignal.create({ data: { cardId, categoryId, kind, dwellMs } });
    res.json({ ok: true });
  })
);

// Sačuvaj EFEMERNU (AI-generisanu, još neupisanu) karticu — tek sada ide u bazu.
router.post(
  '/save-new',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['categoryId', 'title']);
    const categoryId = intParam(req.body.categoryId, 'categoryId');
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new HttpError(400, 'categoryId ne postoji');
    const type = req.body.type && TYPES.includes(req.body.type) ? req.body.type : 'lesson';
    if (type === 'quiz') validateQuiz(req.body.quiz);
    else if (!req.body.text) throw new HttpError(400, 'text je obavezan');
    // dedup: ako ista kartica (kategorija + naslov) već postoji, samo je sačuvaj
    let card = await prisma.card.findFirst({ where: { categoryId, title: req.body.title } });
    if (!card) {
      card = await prisma.card.create({
        data: {
          categoryId,
          type,
          title: req.body.title,
          text: req.body.text || '',
          quiz: req.body.quiz ?? undefined,
          source: 'ai',
          sourceRef: req.body.sourceRef ?? null,
        },
      });
    }
    await prisma.savedCard.upsert({ where: { cardId: card.id }, update: {}, create: { cardId: card.id } });
    res.status(201).json({ saved: true, card });
  })
);

router.post(
  '/:id/save',
  asyncHandler(async (req, res) => {
    const cardId = intParam(req.params.id, 'id');
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new HttpError(404, 'Kartica ne postoji');
    await prisma.savedCard.upsert({ where: { cardId }, update: {}, create: { cardId } });
    res.json({ saved: true });
  })
);

router.delete(
  '/:id/save',
  asyncHandler(async (req, res) => {
    const cardId = intParam(req.params.id, 'id');
    await prisma.savedCard.deleteMany({ where: { cardId } });
    res.json({ saved: false });
  })
);

router.post(
  '/:id/seen',
  asyncHandler(async (req, res) => {
    const cardId = intParam(req.params.id, 'id');
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new HttpError(404, 'Kartica ne postoji');
    await prisma.seenCard.upsert({ where: { cardId }, update: { seenAt: new Date() }, create: { cardId } });
    res.json({ seen: true });
  })
);

router.post(
  '/:id/quiz-answer',
  asyncHandler(async (req, res) => {
    const cardId = intParam(req.params.id, 'id');
    if (typeof req.body?.correct !== 'boolean') throw new HttpError(400, 'correct mora biti boolean');
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new HttpError(404, 'Kartica ne postoji');
    if (card.type !== 'quiz') throw new HttpError(400, 'Kartica nije kviz');
    await prisma.quizAnswer.create({ data: { cardId, correct: req.body.correct } });
    // pogrešan/tačan kviz je i adaptivni signal za tu kategoriju
    await prisma.cardSignal.create({
      data: { cardId, categoryId: card.categoryId, kind: req.body.correct ? 'know' : 'dont_know', dwellMs: 0 },
    });
    const [total, correct] = await Promise.all([
      prisma.quizAnswer.count(),
      prisma.quizAnswer.count({ where: { correct: true } }),
    ]);
    res.json({ ok: true, stats: { total, correct } });
  })
);

export default router;
