import { describe, it, expect } from 'vitest';
import { chunkPages } from '../src/services/chunker.js';
import { normalizeTitle, titleSimilarity, isDuplicateTitle } from '../src/services/dedup.js';

describe('chunkPages', () => {
  it('vraća prazan niz za prazan ulaz', () => {
    expect(chunkPages([''])).toEqual([]);
  });

  it('deli dugačak tekst na više segmenata sa preklapanjem', () => {
    const page = 'Ovo je rečenica broj X. '.repeat(3000); // ~72k znakova
    const chunks = chunkPages([page]);
    expect(chunks.length).toBeGreaterThan(3);
    // svaki segment je u okviru maksimuma
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(20000);
  });

  it('prati raspon strana kada su strane poznate', () => {
    const pages = Array.from({ length: 40 }, (_, i) => `Strana ${i + 1}. ` + 'tekst '.repeat(200));
    const chunks = chunkPages(pages);
    expect(chunks[0].startPage).toBe(1);
    const last = chunks[chunks.length - 1];
    expect(last.endPage).toBeGreaterThanOrEqual(last.startPage);
    expect(last.endPage).toBeLessThanOrEqual(40);
  });
});

describe('dedup', () => {
  it('normalizuje dijakritike i interpunkciju', () => {
    expect(normalizeTitle('Šećer, so — i Đumbir!')).toBe('secer so i djumbir');
  });

  it('prepoznaje slične naslove', () => {
    expect(titleSimilarity('Kako radi DNS', 'Kako DNS radi')).toBeGreaterThan(0.7);
    expect(isDuplicateTitle('Jake lozinke', ['jake  lozinke'])).toBe(true);
    expect(isDuplicateTitle('Hobotnica ima tri srca', ['Migracija ptica'])).toBe(false);
  });
});
