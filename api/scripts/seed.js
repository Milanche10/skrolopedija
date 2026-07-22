/**
 * Seed: 1) kategorije + kartice iz prototipa skrolopedija.html (ako fajl postoji),
 *       2) 10 novih kategorija sa početnim karticama iz seed-data/*.json.
 * Idempotentan — može se pokretati više puta bez duplikata.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { parsePrototype } from './parsePrototype.js';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROTOTYPE_CANDIDATES = [
  process.env.PROTOTYPE_HTML,
  path.resolve(__dirname, '../../skrolopedija.html'),
  path.resolve(__dirname, '../skrolopedija.html'),
  '/app/project/skrolopedija.html',
].filter(Boolean);

const FALLBACK_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#f97316', '#06b6d4'];

async function upsertCategory({ key, label, color, icon, sortOrder }) {
  return prisma.category.upsert({
    where: { key },
    update: {}, // ne gazimo korisničke izmene pri ponovnom seed-u
    create: {
      key,
      label,
      color: color || FALLBACK_COLORS[Math.abs(hash(key)) % FALLBACK_COLORS.length],
      icon: icon || '📚',
      sortOrder: sortOrder ?? 0,
    },
  });
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

async function insertCardIfNew({ categoryId, type, title, text, quiz, source, sourceRef, bookId = null }) {
  const exists = await prisma.card.findFirst({ where: { categoryId, title } });
  if (exists) return false;
  await prisma.card.create({
    data: { categoryId, bookId, type, title, text: text || '', quiz: quiz ?? undefined, source, sourceRef },
  });
  return true;
}

async function seedPrototype() {
  const htmlPath = PROTOTYPE_CANDIDATES.find((p) => fs.existsSync(p));
  if (!htmlPath) {
    console.warn(
      'UPOZORENJE: skrolopedija.html nije nađen (traženo: ' +
        PROTOTYPE_CANDIDATES.join(', ') +
        '). Ubaci prototip u koren projekta i ponovo pokreni seed (docker compose restart api ili npm run seed).'
    );
    return { cats: 0, cards: 0 };
  }
  console.log(`Parsiram prototip: ${htmlPath}`);
  const { cats, cards } = parsePrototype(htmlPath);
  let sortOrder = 0;
  const byKey = new Map();
  for (const cat of cats) {
    const row = await upsertCategory({ ...cat, sortOrder: sortOrder++ });
    byKey.set(cat.key, row);
  }
  let inserted = 0;
  for (const card of cards) {
    const cat = byKey.get(card.cat) || (card.cat ? await upsertCategory({ key: card.cat, label: card.cat }) : null);
    if (!cat) {
      console.warn(`Kartica "${card.title}" preskočena — nepoznata kategorija "${card.cat}"`);
      continue;
    }
    if (!byKey.has(cat.key)) byKey.set(cat.key, cat);
    const ok = await insertCardIfNew({
      categoryId: cat.id,
      type: card.type,
      title: card.title,
      text: card.text,
      quiz: card.quiz,
      source: 'seed',
      sourceRef: card.book ? `Knjiga: ${card.book}` : null,
    });
    if (ok) inserted++;
  }
  console.log(`Prototip: ${cats.length} kategorija, ${inserted} novih kartica (od ${cards.length}).`);
  return { cats: cats.length, cards: inserted };
}

async function seedNewCategories() {
  const dataDir = path.resolve(__dirname, '../seed-data');
  const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')) : [];
  let catCount = 0;
  let cardCount = 0;
  for (const file of files) {
    const payload = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    for (const entry of payload.categories || []) {
      const cat = await upsertCategory(entry);
      catCount++;
      for (const card of entry.cards || []) {
        const ok = await insertCardIfNew({
          categoryId: cat.id,
          type: card.quiz ? 'quiz' : card.type || 'lesson',
          title: card.title,
          text: card.text,
          quiz: card.quiz,
          source: 'ai',
        });
        if (ok) cardCount++;
      }
    }
  }
  console.log(`Nove kategorije: ${catCount} obrađeno, ${cardCount} novih kartica.`);
}

async function main() {
  // Brzi izlaz ako je baza već popunjena — inače bi seed na SVAKOM cold-startu
  // radio ~150 upita ka uspavanom Neon-u (~40s) i držao API nedostupnim.
  // Pusti pun seed sa FORCE_SEED=true.
  if (!process.env.FORCE_SEED) {
    const [catCount, cardCount] = await Promise.all([prisma.category.count(), prisma.card.count()]);
    if (catCount >= 10 && cardCount >= 50) {
      console.log(`Baza već popunjena (${catCount} kategorija, ${cardCount} kartica) — seed preskočen (FORCE_SEED=true za pun seed).`);
      return;
    }
  }
  await seedPrototype();
  await seedNewCategories();
  // kategorija za kartice iz knjiga mora postojati
  await upsertCategory({ key: 'knjige', label: 'Knjige', color: '#b45309', icon: '📖', sortOrder: 99 });
  const totals = await prisma.$transaction([prisma.category.count(), prisma.card.count()]);
  console.log(`Ukupno u bazi: ${totals[0]} kategorija, ${totals[1]} kartica.`);
}

main()
  .catch((e) => {
    console.error('Seed pao:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
