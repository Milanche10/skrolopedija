import crypto from 'crypto';
import { prisma } from './prisma.js';

// Bez eksternih zavisnosti — Node ugrađeni crypto (scrypt za lozinke, HMAC-SHA256 JWT).
// Tajni ključ za JWT:
//  1) JWT_SECRET env (preporučeno — postavi u Render dashboard-u), inače
//  2) izvedi STABILAN ključ iz DATABASE_URL (tajna koja POSTOJI u prod env-u, a NIJE u
//     javnom repo-u) — tako se poznati dev-default NIKAD ne koristi na deployu, i tokeni
//     preživljavaju restart (DATABASE_URL se ne menja). Menja se samo ako rotiraš DB lozinku.
//  3) tek ako nema ni DATABASE_URL (čist lokalni dev bez baze) → fiksni dev string.
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.DATABASE_URL) {
    return crypto.createHmac('sha256', 'skrolopedija/jwt/v1').update(process.env.DATABASE_URL).digest('hex');
  }
  console.warn('[auth] Ni JWT_SECRET ni DATABASE_URL nisu postavljeni — koristim nesiguran dev ključ.');
  return 'skrolopedija-dev-secret-change-me';
}
const JWT_SECRET = resolveJwtSecret();
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 dana

// ---- Lozinke: scrypt (memorijski-tvrd) sa nasumičnom soli ----
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(plain), salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}
export function verifyPassword(plain, stored) {
  try {
    const [algo, saltHex, hashHex] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(String(plain), salt, expected.length);
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// ---- JWT (HS256), ručno ----
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const b64uJson = (obj) => b64u(JSON.stringify(obj));

export function signToken(user) {
  const header = b64uJson({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64uJson({ uid: user.id, role: user.role, iat: now, exp: now + TOKEN_TTL_SEC });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}
function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- Role hijerarhija: guest < user < premium < moderator < admin < superadmin ----
export const ROLES = ['guest', 'user', 'premium', 'moderator', 'admin', 'superadmin'];
const RANK = { guest: 0, user: 1, premium: 2, moderator: 3, admin: 4, superadmin: 5 };
export const roleRank = (role) => RANK[role] ?? 0;
/** Da li korisnik ima BAR zadati nivo (npr. hasRole(u,'admin') → admin ili superadmin). */
export const hasRole = (user, min) => roleRank(user?.role) >= (RANK[min] ?? 99);

/** Javni prikaz korisnika (bez hash-a). tier = pojednostavljen nivo za UI. */
export function publicUser(u) {
  if (!u) return null;
  const rank = roleRank(u.role);
  const tier =
    rank >= RANK.admin ? 'admin' : rank === RANK.moderator ? 'moderator' : rank >= RANK.premium || u.paid ? 'premium' : 'user';
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    paid: u.paid,
    tier,
  };
}

/** Middleware: čita Bearer token (ako postoji) i puni req.user; gost = null. */
export async function authOptional(req, _res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  req.user = null;
  if (m) {
    const payload = verifyToken(m[1]);
    if (payload?.uid) {
      const user = await prisma.user.findUnique({ where: { id: payload.uid } }).catch(() => null);
      if (user) req.user = user;
    }
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Potrebna prijava' });
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Potrebna prijava' });
  if (!hasRole(req.user, 'admin')) return res.status(403).json({ error: 'Samo za administratore' });
  next();
}
export function requireModerator(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Potrebna prijava' });
  if (!hasRole(req.user, 'moderator')) return res.status(403).json({ error: 'Samo za moderatore' });
  next();
}
/** Pun pristup (premium sadržaj, AI tutor…): plaćeni ili role ≥ premium. */
export function isFull(user) {
  return Boolean(user && (user.paid || roleRank(user.role) >= RANK.premium));
}
