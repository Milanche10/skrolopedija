import fs from 'fs/promises';
import { prisma } from '../lib/prisma.js';
import { extractText } from './extractText.js';
import { chunkPages } from './chunker.js';
import { segmentToCards, quizFromLessons } from './cardGen.js';
import { isDuplicateTitle } from './dedup.js';
import { enqueueBookJob } from './jobs.js';
import { chunkCharsForProvider } from '../lib/llm.js';

const QUIZ_EVERY = 10; // otprilike svakih 10 lekcija jedan kviz

/** Kategorija u koju idu kartice iz knjiga. */
export async function getBooksCategory() {
  let cat = await prisma.category.findUnique({ where: { key: 'knjige' } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { key: 'knjige', label: 'Knjige', color: '#b45309', icon: '📖', sortOrder: 99 },
    });
  }
  return cat;
}

/** Stavi knjigu u red za obradu. Vraća false ako je već u redu. */
export function startProcessing(bookId) {
  return enqueueBookJob(bookId, () => processBook(bookId));
}

export async function processBook(bookId) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return;
  // Fajl možda ne postoji na OVOM serveru (npr. knjiga registrovana lokalno,
  // a pokrećeš obradu na Renderu) — jasna poruka umesto sirovog ENOENT-a.
  try {
    await fs.access(book.filePath);
  } catch {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'failed',
        error: 'Fajl nije dostupan na ovom serveru. Ova knjiga je registrovana lokalno — obradi je lokalno (DEPLOY.md → „Knjige u produkciju"), ili je dodaj preko dugmeta „Upload".',
      },
    });
    return;
  }
  await prisma.book.update({
    where: { id: bookId },
    data: { status: 'processing', error: null, doneSegments: 0 },
  });
  try {
    const buffer = await fs.readFile(book.filePath);
    const { pages, pageCount, needsOcr } = await extractText(book.filePath, book.fileType, buffer);
    if (needsOcr) {
      throw new Error(
        'Fajl nema tekstualni sloj (verovatno skenirane slike) — potreban je OCR pre obrade. Provuci PDF kroz OCR alat pa ga ponovo dodaj.'
      );
    }
    const chunks = chunkPages(pages, chunkCharsForProvider());
    if (!chunks.length) throw new Error('Iz fajla nije izvučen upotrebljiv tekst.');

    await prisma.book.update({
      where: { id: bookId },
      data: { pageCount: pageCount || null, totalSegments: chunks.length },
    });

    const booksCat = await getBooksCategory();
    const existing = await prisma.card.findMany({
      where: { bookId },
      select: { title: true },
    });
    const existingTitles = existing.map((c) => c.title);
    let lessonsSinceQuiz = [];
    let created = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const sourceRef =
        chunk.startPage != null
          ? chunk.startPage === chunk.endPage
            ? `str. ${chunk.startPage}`
            : `str. ${chunk.startPage}–${chunk.endPage}`
          : `segment ${i + 1}`;
      try {
        const cards = await segmentToCards({
          bookTitle: book.title,
          author: book.author,
          segmentText: chunk.text,
        });
        for (const c of cards) {
          if (isDuplicateTitle(c.title, existingTitles)) continue;
          existingTitles.push(c.title);
          await prisma.card.create({
            data: {
              categoryId: booksCat.id,
              bookId,
              type: 'book',
              title: c.title,
              text: c.text,
              source: 'book',
              sourceRef,
            },
          });
          created++;
          lessonsSinceQuiz.push(c);
        }

        if (lessonsSinceQuiz.length >= QUIZ_EVERY) {
          try {
            const q = await quizFromLessons({
              bookTitle: book.title,
              lessons: lessonsSinceQuiz.slice(-QUIZ_EVERY),
            });
            await prisma.card.create({
              data: {
                categoryId: booksCat.id,
                bookId,
                type: 'quiz',
                title: q.title || `Kviz: ${book.title}`,
                text: '',
                quiz: q.quiz,
                source: 'book',
                sourceRef,
              },
            });
            created++;
          } catch (err) {
            console.warn(`Kviz za knjigu ${bookId} nije uspeo:`, err.message);
          }
          lessonsSinceQuiz = [];
        }
      } catch (err) {
        // jedan pokvaren segment ne sme da obori celu knjigu
        console.error(`Segment ${i + 1}/${chunks.length} knjige ${bookId} pao:`, err.message);
      }
      await prisma.book.update({
        where: { id: bookId },
        data: { doneSegments: i + 1, cardCount: created },
      });
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { status: 'done', cardCount: created },
    });
    console.log(`Knjiga "${book.title}" obrađena: ${created} kartica iz ${chunks.length} segmenata.`);
  } catch (err) {
    await prisma.book.update({
      where: { id: bookId },
      data: { status: 'failed', error: String(err.message || err) },
    });
    console.error(`Obrada knjige ${bookId} neuspešna:`, err.message);
  }
}
