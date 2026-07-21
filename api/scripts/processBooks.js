/**
 * Obradi SVE neobrađene knjige iz foldera baze znanja — jednokratno, pa izađi.
 *
 * Glavna namena: lokalna obrada knjiga (besplatna Ollama) uz upis kartica
 * DIREKTNO u produkcijsku bazu (Neon), tako da knjige ne moraš da šalješ
 * na server:
 *
 *   docker compose run --rm \
 *     -e DATABASE_URL="postgresql://...neon..." \
 *     api sh -c "npx prisma migrate deploy && node scripts/processBooks.js"
 *
 * Opciono:
 *   `node scripts/processBooks.js <bookId>` — obradi samo jednu knjigu (i ponovo, ako je završena)
 *   `node scripts/processBooks.js scan`     — samo registruj fajlove, bez obrade
 */
import fs from 'fs/promises';
import { prisma } from '../src/lib/prisma.js';
import { scanKnowledgeDir } from '../src/services/scan.js';
import { processBook } from '../src/services/bookPipeline.js';
import { aiStatus } from '../src/lib/llm.js';

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 50;

const arg = process.argv[2] || '';
const scanOnly = arg === 'scan';
const onlyId = !scanOnly && arg ? Number(arg) : null;

const ai = await aiStatus();
if (!ai.ready) {
  console.error(`AI nije spreman (${ai.provider}/${ai.model}): ${ai.note || ai.error || 'proveri konfiguraciju'}`);
  process.exit(1);
}
const dbHost = (process.env.DATABASE_URL || '').split('@')[1]?.split('/')[0] || '?';
console.log(`AI: ${ai.provider}/${ai.model} · Baza: ${dbHost}`);

// Neon (i drugi serverless Postgres) se uspavaju — probudi bazu pre rada,
// da hladan start ne obori prvi upit (Prisma pool_timeout je samo 10s).
async function warmup(retries = 6) {
  for (let i = 0; i <= retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (i > 0) console.log('Baza je budna.');
      return;
    } catch (e) {
      if (i === retries) throw e;
      console.log(`Budim bazu… (pokušaj ${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}
await warmup();

// registruj nove fajlove (bez pokretanja pozadinskih poslova — obrada ide ovde, redom)
const scan = await scanKnowledgeDir(false);
if (scan.error) console.warn(scan.error);
else console.log(`Sken: ${scan.scanned} fajlova, ${scan.added.length} novih registrovano, ${scan.existing} već poznato.`);

if (scanOnly) {
  const list = await prisma.book.findMany({ orderBy: { id: 'asc' }, select: { id: true, title: true, status: true } });
  for (const b of list) console.log(`  #${b.id} [${b.status}] ${b.title}`);
  await prisma.$disconnect();
  process.exit(0);
}

let books;
if (onlyId) {
  books = await prisma.book.findMany({ where: { id: onlyId } });
  if (!books.length) {
    console.error(`Knjiga ${onlyId} ne postoji.`);
    process.exit(1);
  }
} else {
  books = await prisma.book.findMany({
    where: { status: { in: ['uploaded', 'failed'] } },
    orderBy: { id: 'asc' },
  });
}

console.log(`Za obradu: ${books.length} knjiga (preskačem fajlove > ${MAX_FILE_MB}MB).`);
for (const b of books) {
  try {
    const { size } = await fs.stat(b.filePath);
    const mb = size / 1024 / 1024;
    if (mb > MAX_FILE_MB && !onlyId) {
      console.log(`\n⏭  Preskačem "${b.title}" (${mb.toFixed(0)}MB > ${MAX_FILE_MB}MB). Obradi pojedinačno: processBooks.js ${b.id}`);
      continue;
    }
  } catch {
    /* stat pao — pusti pipeline da prijavi grešku */
  }
  console.log(`\n→ Obrađujem: "${b.title}" (id ${b.id})`);
  await processBook(b.id); // sekvencijalno — ne gušimo AI; greške završe kao status=failed
  const done = await prisma.book.findUnique({ where: { id: b.id } });
  console.log(`  status: ${done.status}, kartica: ${done.cardCount}${done.error ? `, greška: ${done.error}` : ''}`);
}

const totals = await prisma.card.count();
console.log(`\nGotovo. Ukupno kartica u bazi: ${totals}.`);
await prisma.$disconnect();
