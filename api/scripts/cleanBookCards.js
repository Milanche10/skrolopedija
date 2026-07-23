/**
 * Čišćenje SLABIH kartica iz knjiga.
 *  - „slaba" = kratka (tekst < MIN_LEN), fragment, ili duplikat naslova unutar iste knjige
 *  - kvizovi i ne-book kartice se NE diraju
 * Podrazumevano DRY-RUN (samo izveštaj). Obriši sa:  APPLY=true node scripts/cleanBookCards.js
 * Prag:  MIN_LEN=140 (podesivo).
 */
import { prisma } from '../src/lib/prisma.js';

const MIN_LEN = Number(process.env.MIN_LEN) || 140;
const APPLY = process.env.APPLY === 'true';

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// „fragment" tekst: previše kratak, ili nema pravu rečenicu (bez tačke i malo reči)
function isWeakText(text) {
  const t = clean(text);
  if (t.length < MIN_LEN) return true;
  const words = t.split(' ').filter(Boolean).length;
  if (words < 20) return true; // premalo sadržaja
  const letters = (t.match(/[a-zA-ZšđčćžŠĐČĆŽ]/g) || []).length;
  if (letters / t.length < 0.55) return true; // uglavnom brojevi/reference/simboli
  return false;
}

const books = await prisma.book.findMany({ select: { id: true, title: true } });
const bookName = new Map(books.map((b) => [b.id, b.title]));

// sve book-kartice (bookId != null), bez kvizova (oni nemaju tekst)
const cards = await prisma.card.findMany({
  where: { bookId: { not: null }, type: { not: 'quiz' } },
  select: { id: true, bookId: true, title: true, text: true },
  orderBy: { id: 'asc' },
});

const toDelete = new Set();
const reasonByBook = new Map(); // bookId -> {short, dup, total}

// 1) slabe (kratke/fragment)
for (const c of cards) {
  const r = reasonByBook.get(c.bookId) || { total: 0, short: 0, dup: 0 };
  r.total++;
  reasonByBook.set(c.bookId, r);
  if (isWeakText(c.text)) {
    toDelete.add(c.id);
    r.short++;
  }
}

// 2) duplikati naslova unutar knjige — zadrži NAJDUŽI tekst, ostale obriši
const byKey = new Map(); // `${bookId}::${normTitle}` -> [cards]
for (const c of cards) {
  const k = `${c.bookId}::${norm(c.title)}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(c);
}
for (const [, group] of byKey) {
  if (group.length < 2) continue;
  group.sort((a, b) => clean(b.text).length - clean(a.text).length);
  for (let i = 1; i < group.length; i++) {
    if (!toDelete.has(group[i].id)) {
      toDelete.add(group[i].id);
      const r = reasonByBook.get(group[i].bookId);
      if (r) r.dup++;
    }
  }
}

// izveštaj po knjizi
console.log(`\n=== ČIŠĆENJE BOOK KARTICA (MIN_LEN=${MIN_LEN}, APPLY=${APPLY}) ===`);
let totalDel = 0;
let grandTotal = 0;
for (const [bookId, r] of [...reasonByBook.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const del = cards.filter((c) => c.bookId === bookId && toDelete.has(c.id)).length;
  totalDel += del;
  grandTotal += r.total;
  console.log(
    `#${bookId} ${clean(bookName.get(bookId)).slice(0, 40).padEnd(40)} | ukupno ${String(r.total).padStart(4)} | brišem ${String(del).padStart(4)} | ostaje ${String(r.total - del).padStart(4)}`
  );
}
console.log(`------------------------------------------------`);
console.log(`UKUPNO book-kartica: ${grandTotal} | za brisanje: ${totalDel} | ostaje: ${grandTotal - totalDel}`);

// par primera slabih (za proveru)
const sample = cards.filter((c) => toDelete.has(c.id)).slice(0, 6);
console.log(`\nPrimeri slabih (biće obrisane):`);
for (const c of sample) console.log(`  · "${clean(c.title).slice(0, 50)}" — ${clean(c.text).length} znakova: "${clean(c.text).slice(0, 70)}…"`);

if (APPLY && toDelete.size) {
  const ids = [...toDelete];
  // obriši u serijama (izbegni prevelik IN)
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500);
    const res = await prisma.card.deleteMany({ where: { id: { in: batch } } });
    deleted += res.count;
  }
  console.log(`\n✅ OBRISANO: ${deleted} kartica.`);
} else if (!APPLY) {
  console.log(`\n(DRY-RUN — ništa nije obrisano. Pokreni sa APPLY=true da obrišeš.)`);
}

await prisma.$disconnect();
