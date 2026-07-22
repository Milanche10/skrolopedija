import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, requireFields } from '../lib/errors.js';
import { hashPassword, verifyPassword, signToken, publicUser, requireUser } from '../lib/auth.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['email', 'username', 'password']);
    const email = String(req.body.email).trim().toLowerCase();
    const username = String(req.body.username).trim();
    if (!EMAIL.test(email)) throw new HttpError(400, 'Neispravan email');
    if (username.length < 3) throw new HttpError(400, 'Korisničko ime mora imati bar 3 znaka');
    if (String(req.body.password).length < 6) throw new HttpError(400, 'Lozinka mora imati bar 6 znakova');

    const dup = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (dup) throw new HttpError(409, dup.email === email ? 'Email je već registrovan' : 'Korisničko ime je zauzeto');

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hashPassword(req.body.password),
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
        role: 'user',
      },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['identifier', 'password']);
    const id = String(req.body.identifier).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: id }, { username: String(req.body.identifier).trim() }] },
    });
    if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) {
      throw new HttpError(401, 'Pogrešan email/korisničko ime ili lozinka');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

router.patch(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const data = {};
    if (req.body.firstName !== undefined) data.firstName = String(req.body.firstName).slice(0, 60) || null;
    if (req.body.lastName !== undefined) data.lastName = String(req.body.lastName).slice(0, 60) || null;
    if (req.body.username !== undefined) {
      const username = String(req.body.username).trim();
      if (username.length < 3) throw new HttpError(400, 'Korisničko ime mora imati bar 3 znaka');
      const dup = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.id } } });
      if (dup) throw new HttpError(409, 'Korisničko ime je zauzeto');
      data.username = username;
    }
    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ user: publicUser(user) });
  })
);

router.post(
  '/change-password',
  requireUser,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['current', 'next']);
    if (!(await verifyPassword(req.body.current, req.user.passwordHash))) {
      throw new HttpError(400, 'Trenutna lozinka nije tačna');
    }
    if (String(req.body.next).length < 6) throw new HttpError(400, 'Nova lozinka mora imati bar 6 znakova');
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await hashPassword(req.body.next) } });
    res.json({ ok: true });
  })
);

export default router;
