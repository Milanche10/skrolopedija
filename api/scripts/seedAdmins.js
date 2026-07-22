/**
 * Bootstrap admin naloga iz env promenljive ADMIN_SEED (JSON niz).
 * Lozinke se HEŠIRAJU (scrypt) — plaintext nikad ne ide u bazu ni u git.
 *
 * Bezbedno za pokretanje na SVAKI boot:
 *  - nalog NE postoji  → kreira se (role=admin, paid=true, heš lozinke)
 *  - nalog VEĆ postoji → preskače se (ne dira lozinku/role — da deploy ne resetuje
 *    lozinku koju je admin u međuvremenu promenio)
 * Za prinudni reset lozinke postavi ADMIN_SEED_FORCE=true.
 *
 * Primer:
 *   ADMIN_SEED='[{"email":"a@b.com","username":"admin","password":"tajna","firstName":"Ime"}]'
 *   node scripts/seedAdmins.js
 */
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/auth.js';

const raw = process.env.ADMIN_SEED;
const force = process.env.ADMIN_SEED_FORCE === 'true';
if (!raw) {
  console.log('ADMIN_SEED nije postavljen — preskačem seed admina.');
  process.exit(0);
}

let accounts;
try {
  accounts = JSON.parse(raw);
  if (!Array.isArray(accounts)) throw new Error('nije niz');
} catch (e) {
  console.error('ADMIN_SEED nije validan JSON niz:', e.message);
  process.exit(1);
}

for (const a of accounts) {
  if (!a.email || !a.password) {
    console.warn('Preskačem nalog bez email/password:', a.email);
    continue;
  }
  const email = String(a.email).trim().toLowerCase();
  const username = String(a.username || email.split('@')[0]).trim();
  const role = a.role === 'superadmin' ? 'superadmin' : 'admin';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (force) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash: await hashPassword(a.password), role, paid: true },
      });
      console.log(`Admin lozinka RESETOVANA (force): ${email}`);
    } else {
      console.log(`Admin već postoji — preskačem: ${email}`);
    }
    continue;
  }
  await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: await hashPassword(a.password),
      role,
      paid: true,
      firstName: a.firstName || null,
      lastName: a.lastName || null,
    },
  });
  console.log(`Admin kreiran: ${email}`);
}
await prisma.$disconnect();
