import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, intParam } from '../lib/errors.js';
import { publicUser } from '../lib/auth.js';

// Sve rute ovde su već zaštićene requireAdmin (u app.js).
const router = Router();

// Dashboard: brojevi + jednostavni podaci za chartove.
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [users, paidUsers, admins, cards, categories, books, quizzes, signals, answers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { paid: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.card.count(),
      prisma.category.count(),
      prisma.book.count(),
      prisma.card.count({ where: { type: 'quiz' } }),
      prisma.cardSignal.count(),
      prisma.quizAnswer.count(),
    ]);

    // kartice po kategoriji (za chart)
    const cats = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { cards: true } } },
    });
    const byCategory = cats.map((c) => ({ label: c.label, color: c.color, count: c._count.cards }));

    // kartice po izvoru
    const sources = ['seed', 'ai', 'book', 'web'];
    const bySource = [];
    for (const s of sources) bySource.push({ source: s, count: await prisma.card.count({ where: { source: s } }) });

    // registracije po danu (poslednjih 14 dana)
    const since = new Date(Date.now() - 14 * 86400000);
    const recentUsers = await prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });

    res.json({
      totals: { users, paidUsers, admins, cards, categories, books, quizzes, signals, answers },
      byCategory,
      bySource,
      signups: recentUsers.map((u) => u.createdAt),
    });
  })
);

// Lista korisnika
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.json(users.map(publicUser));
  })
);

// Izmena role/paid korisnika
router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const data = {};
    if (req.body.role !== undefined) {
      if (!['user', 'admin'].includes(req.body.role)) throw new HttpError(400, 'role mora biti user ili admin');
      data.role = req.body.role;
    }
    if (req.body.paid !== undefined) data.paid = Boolean(req.body.paid);
    try {
      const user = await prisma.user.update({ where: { id }, data });
      res.json(publicUser(user));
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Korisnik ne postoji');
      throw err;
    }
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    if (id === req.user.id) throw new HttpError(400, 'Ne možeš obrisati sopstveni nalog');
    await prisma.user.delete({ where: { id } }).catch((err) => {
      if (err.code === 'P2025') throw new HttpError(404, 'Korisnik ne postoji');
      throw err;
    });
    res.json({ ok: true });
  })
);

export default router;
