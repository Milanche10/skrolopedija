import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { startProcessing } from './bookPipeline.js';

const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || path.resolve('baza-znanja');

const EXT_TYPE = { '.pdf': 'pdf', '.docx': 'docx' };

function titleFromFilename(name) {
  return path
    .basename(name, path.extname(name))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\d*\s*\)|\(PDFDrive\)/gi, '')
    .trim();
}

/**
 * Skenira folder baze znanja: registruje nove fajlove kao knjige (dedup po hash-u).
 * @param {boolean} autoProcess odmah pokreni obradu novih knjiga
 */
export async function scanKnowledgeDir(autoProcess = true) {
  // Osiguraj da folder postoji (na Renderu ga nema pri startu → inače ENOENT).
  await fs.mkdir(KNOWLEDGE_DIR, { recursive: true }).catch(() => {});
  let entries;
  try {
    entries = await fs.readdir(KNOWLEDGE_DIR);
  } catch (err) {
    return { scanned: 0, added: [], existing: 0, error: `Folder ${KNOWLEDGE_DIR} nije dostupan: ${err.code || err.message}` };
  }
  if (entries.length === 0) {
    return {
      scanned: 0,
      added: [],
      existing: 0,
      error:
        'Folder baze znanja je prazan (na hostingu nema tvojih lokalnih fajlova). ' +
        'Knjige dodaj preko dugmeta „Upload", ili ih obradi lokalno u Neon bazu ' +
        '(vidi DEPLOY.md → „Knjige u produkciju").',
    };
  }
  const added = [];
  let existing = 0;
  let scanned = 0;
  for (const name of entries) {
    const ext = path.extname(name).toLowerCase();
    const fileType = EXT_TYPE[ext];
    if (!fileType) continue;
    scanned++;
    const filePath = path.join(KNOWLEDGE_DIR, name);
    const buffer = await fs.readFile(filePath);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const found = await prisma.book.findUnique({ where: { fileHash } });
    if (found) {
      existing++;
      continue;
    }
    const book = await prisma.book.create({
      data: { title: titleFromFilename(name), filePath, fileType, fileHash },
    });
    added.push(book);
  }
  if (autoProcess) for (const b of added) startProcessing(b.id);
  return { scanned, added, existing };
}
