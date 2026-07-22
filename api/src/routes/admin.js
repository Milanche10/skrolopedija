import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, intParam } from '../lib/errors.js';
import { publicUser, ROLES, roleRank, hasRole } from '../lib/auth.js';

// Sve rute ovde su već zaštićene requireAdmin (u app.js).
const router = Router();

// Dashboard: brojevi + jednostavni podaci za chartove.
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [users, paidUsers, admins, cards, categories, books, quizzes, signals, answers, activeWeekRows] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { paid: true } }),
      prisma.user.count({ where: { role: { in: ['admin', 'superadmin'] } } }),
      prisma.card.count(),
      prisma.category.count(),
      prisma.book.count(),
      prisma.card.count({ where: { type: 'quiz' } }),
      prisma.cardSignal.count(),
      prisma.quizAnswer.count(),
      // aktivni korisnici (imali signal) u poslednjih 7 dana
      prisma.cardSignal.findMany({ where: { createdAt: { gte: weekAgo } }, distinct: ['userId'], select: { userId: true } }),
    ]);
    const activeWeek = activeWeekRows.length;

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
      totals: { users, paidUsers, admins, activeWeek, cards, categories, books, quizzes, signals, answers },
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

// Roleovi koje admin sme da dodeli. Admin-nivo (admin/superadmin) sme SAMO superadmin —
// da običan admin ne bi mogao da eskalira privilegije sebi ili drugom.
const ASSIGNABLE = ROLES.filter((r) => r !== 'guest'); // user..superadmin

// Izmena role/paid korisnika
router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const actorIsSuper = hasRole(req.user, 'superadmin');
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, 'Korisnik ne postoji');

    // Ne-superadmin ne sme da dira admin/superadmin naloge.
    if (!actorIsSuper && roleRank(target.role) >= roleRank('admin')) {
      throw new HttpError(403, 'Samo super admin može menjati admin naloge');
    }

    const data = {};
    if (req.body.role !== undefined) {
      if (!ASSIGNABLE.includes(req.body.role)) throw new HttpError(400, `role mora biti: ${ASSIGNABLE.join(', ')}`);
      // dodela admin-nivoa je rezervisana za superadmina
      if (!actorIsSuper && roleRank(req.body.role) >= roleRank('admin')) {
        throw new HttpError(403, 'Samo super admin može dodeliti admin/superadmin rolu');
      }
      data.role = req.body.role;
    }
    if (req.body.paid !== undefined) data.paid = Boolean(req.body.paid);
    const user = await prisma.user.update({ where: { id }, data });
    res.json(publicUser(user));
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    if (id === req.user.id) throw new HttpError(400, 'Ne možeš obrisati sopstveni nalog');
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, 'Korisnik ne postoji');
    // admin/superadmin nalog sme da obriše samo superadmin
    if (roleRank(target.role) >= roleRank('admin') && !hasRole(req.user, 'superadmin')) {
      throw new HttpError(403, 'Samo super admin može obrisati admin nalog');
    }
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
