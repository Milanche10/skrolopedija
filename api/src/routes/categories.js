import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, requireFields, intParam } from '../lib/errors.js';
import { generateCategoryCards, generateCategoryQuizzes } from '../services/cardGen.js';
import { isDuplicateTitle } from '../services/dedup.js';
import { requireAdmin, allowedCategoryKeys } from '../lib/auth.js';

const router = Router();

const HEX = /^#[0-9a-fA-F]{6}$/;

function validateCategoryBody(body, partial = false) {
  if (!partial) requireFields(body, ['key', 'label']);
  if (body.color !== undefined && !HEX.test(body.color)) {
    throw new HttpError(400, 'color mora biti hex boja, npr. #7c3aed');
  }
  if (body.key !== undefined && !/^[a-z0-9-]+$/.test(body.key)) {
    throw new HttpError(400, 'key mora biti slug (mala slova, brojevi, crtice)');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.query.all === '1' ? {} : { isActive: true };
    // obični korisnici/gosti vide samo dozvoljene oblasti; moderator+ vide sve
    const allowed = allowedCategoryKeys(req.user);
    if (allowed) where.key = { in: allowed };
    const cats = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { cards: { where: { isActive: true } } } } },
    });
    res.json(cats.map((c) => ({ ...c, cardCount: c._count.cards, _count: undefined })));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new HttpError(404, 'Kategorija ne postoji');
    res.json(cat);
  })
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    validateCategoryBody(req.body);
    const exists = await prisma.category.findUnique({ where: { key: req.body.key } });
    if (exists) throw new HttpError(409, `Kategorija sa key "${req.body.key}" već postoji`);
    const cat = await prisma.category.create({
      data: {
        key: req.body.key,
        label: req.body.label,
        color: req.body.color || '#8b5cf6',
        icon: req.body.icon || '📚',
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
    });
    res.status(201).json(cat);
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    validateCategoryBody(req.body, true);
    const data = {};
    for (const f of ['key', 'label', 'color', 'icon', 'sortOrder', 'isActive']) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    try {
      const cat = await prisma.category.update({ where: { id }, data });
      res.json(cat);
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Kategorija ne postoji');
      if (err.code === 'P2002') throw new HttpError(409, 'key već postoji');
      throw err;
    }
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    try {
      await prisma.category.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Kategorija ne postoji');
      throw err;
    }
    res.json({ ok: true });
  })
);

// AI generisanje kartica za kategoriju (admin — troši AI)
router.post(
  '/:id/generate',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 20);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new HttpError(404, 'Kategorija ne postoji');

    const existing = await prisma.card.findMany({
      where: { categoryId: id },
      select: { title: true },
      orderBy: { createdAt: 'desc' },
    });
    const existingTitles = existing.map((c) => c.title);

    const generated = await generateCategoryCards(category, existingTitles, count);
    const created = [];
    for (const c of generated) {
      if (isDuplicateTitle(c.title, existingTitles)) continue;
      existingTitles.push(c.title);
      created.push(
        await prisma.card.create({
          data: { categoryId: id, type: c.type, title: c.title, text: c.text, source: 'ai' },
        })
      );
    }
    res.status(201).json({ requested: count, created: created.length, cards: created });
  })
);

// AI generisanje KVIZ kartica za kategoriju (admin — troši AI)
router.post(
  '/:id/quizzes',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 15);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new HttpError(404, 'Kategorija ne postoji');

    const existing = await prisma.card.findMany({ where: { categoryId: id }, select: { title: true } });
    const existingTitles = existing.map((c) => c.title);

    const quizzes = await generateCategoryQuizzes(category, existingTitles, count);
    const created = [];
    for (const q of quizzes) {
      if (isDuplicateTitle(q.title, existingTitles)) continue;
      existingTitles.push(q.title);
      created.push(
        await prisma.card.create({
          data: { categoryId: id, type: 'quiz', title: q.title, text: '', quiz: q.quiz, source: 'ai' },
        })
      );
    }
    res.status(201).json({ requested: count, created: created.length, cards: created });
  })
);

export default router;
