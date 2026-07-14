// Provera ekstrakcije i segmentacije na stvarnim fajlovima (bez AI poziva).
import fs from 'fs/promises';
import path from 'path';
import { extractText } from '../src/services/extractText.js';
import { chunkPages } from '../src/services/chunker.js';

const DIR = process.env.KNOWLEDGE_DIR || '/app/baza-znanja';

async function check(file) {
  const ext = path.extname(file).toLowerCase().slice(1);
  const full = path.join(DIR, file);
  const buf = await fs.readFile(full);
  const { pages, pageCount, needsOcr } = await extractText(full, ext, buf);
  const chunks = chunkPages(pages);
  const chars = pages.reduce((s, p) => s + p.length, 0);
  console.log(
    `${file}\n  strane=${pageCount} znakova=${chars} OCR?=${needsOcr} segmenata=${chunks.length}` +
      (chunks[0] ? `\n  prvi segment (${chunks[0].startPage ?? '?'}. str): "${chunks[0].text.slice(0, 90).replace(/\s+/g, ' ')}…"` : '')
  );
}

const targets = process.argv.slice(2);
for (const t of targets) {
  try {
    await check(t);
  } catch (e) {
    console.error(`${t} PAO: ${e.message}`);
  }
}
