import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, requireFields, intParam } from '../lib/errors.js';
import { requireModerator } from '../lib/auth.js';

const router = Router();

const CATEGORIES = ['vesti', 'radionice', 'projekti', 'konkursi', 'partnerstva', 'gostovanja', 'konferencije'];

function slugify(s) {
  const map = { š: 's', đ: 'dj', č: 'c', ć: 'c', ž: 'z', Š: 's', Đ: 'dj', Č: 'c', Ć: 'c', Ž: 'z' };
  return String(s)
    .replace(/[šđčćžŠĐČĆŽ]/g, (m) => map[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70) || 'objava';
}

async function uniqueSlug(base, ignoreId = null) {
  let slug = base;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.post.findUnique({ where: { slug } });
    if (!found || found.id === ignoreId) return slug;
    slug = `${base}-${++i}`;
  }
}

// Javna lista objava (samo objavljene). ?category= filter. Admin panel koristi ?all=1.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    // nepubliskovane vidi samo moderator+
    const canSeeAll = req.query.all === '1' && req.user && ['moderator', 'admin', 'superadmin'].includes(req.user.role);
    if (!canSeeAll) where.published = true;
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) where.category = String(req.query.category);
    const posts = await prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(posts);
  })
);

// Jedna objava po slug-u
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { slug: String(req.params.slug) } });
    if (!post || (!post.published && !(req.user && ['moderator', 'admin', 'superadmin'].includes(req.user.role)))) {
      throw new HttpError(404, 'Objava ne postoji');
    }
    res.json(post);
  })
);

// --- Uređivanje (moderator+) ---
router.post(
  '/',
  requireModerator,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'vesti';
    const slug = await uniqueSlug(slugify(req.body.title));
    const post = await prisma.post.create({
      data: {
        slug,
        title: String(req.body.title).slice(0, 200),
        category,
        excerpt: String(req.body.excerpt || '').slice(0, 400),
        body: String(req.body.body || ''),
        cover: req.body.cover ? String(req.body.cover).slice(0, 500) : null,
        published: req.body.published !== false,
      },
    });
    res.status(201).json(post);
  })
);

router.put(
  '/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Objava ne postoji');
    const data = {};
    if (req.body.title !== undefined) {
      data.title = String(req.body.title).slice(0, 200);
      data.slug = await uniqueSlug(slugify(req.body.title), id);
    }
    if (req.body.category !== undefined) data.category = CATEGORIES.includes(req.body.category) ? req.body.category : existing.category;
    if (req.body.excerpt !== undefined) data.excerpt = String(req.body.excerpt).slice(0, 400);
    if (req.body.body !== undefined) data.body = String(req.body.body);
    if (req.body.cover !== undefined) data.cover = req.body.cover ? String(req.body.cover).slice(0, 500) : null;
    if (req.body.published !== undefined) data.published = Boolean(req.body.published);
    const post = await prisma.post.update({ where: { id }, data });
    res.json(post);
  })
);

router.delete(
  '/:id',
  requireModerator,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    try {
      await prisma.post.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Objava ne postoji');
      throw err;
    }
    res.json({ ok: true });
  })
);

export default router;
