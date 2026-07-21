import { describe, it, expect } from 'vitest';
import { asCardArray, cleanCards, normalizeQuiz } from '../src/services/cardGen.js';

describe('asCardArray — toleriše različite oblike odgovora modela', () => {
  it('prihvata goli niz', () => {
    expect(asCardArray([{ title: 'A', text: 'B' }])).toHaveLength(1);
  });
  it('vadi niz iz {cards:[...]}', () => {
    expect(asCardArray({ cards: [{ title: 'A', text: 'B' }] })).toHaveLength(1);
  });
  it('vadi niz iz srpskih ključeva {karte:[...]} i {kartice:[...]}', () => {
    expect(asCardArray({ karte: [{ naslov: 'A', tekst: 'B' }] })).toHaveLength(1);
    expect(asCardArray({ kartice: [{ title: 'A', text: 'B' }] })).toHaveLength(1);
  });
  it('umota jednu karticu-objekat (srpski ključevi) u niz', () => {
    expect(asCardArray({ naslov: 'A', tekst: 'B' })).toHaveLength(1);
  });
});

describe('cleanCards — mapira srpska imena polja na title/text', () => {
  it('mapira naslov/tekst i podrazumeva type=lesson', () => {
    const out = cleanCards([{ naslov: 'Vino', tekst: 'Opis vina.' }]);
    expect(out).toEqual([{ title: 'Vino', text: 'Opis vina.', type: 'lesson' }]);
  });
  it('poštuje type=fact i odbacuje kartice bez naslova ili teksta', () => {
    const out = cleanCards([
      { title: 'Cinjenica', text: 'X', type: 'fact' },
      { title: 'Bez teksta' },
      { text: 'bez naslova' },
    ]);
    expect(out).toEqual([{ title: 'Cinjenica', text: 'X', type: 'fact' }]);
  });
});

describe('normalizeQuiz — toleriše srpske ključeve i validira indeks', () => {
  it('normalizuje {kviz:{pitanje,opcije,tacan,objasnjenje}}', () => {
    const q = normalizeQuiz({ kviz: { pitanje: 'P?', opcije: ['A', 'B', 'C'], tacan: 2, objasnjenje: 'E' } });
    expect(q.quiz).toEqual({ q: 'P?', opts: ['A', 'B', 'C'], ok: 2, expl: 'E' });
  });
  it('odbacuje kviz sa indeksom van opsega', () => {
    expect(normalizeQuiz({ quiz: { q: 'P', opts: ['A', 'B'], ok: 5 } })).toBeNull();
  });
  it('odbacuje kviz bez dovoljno opcija', () => {
    expect(normalizeQuiz({ quiz: { q: 'P', opts: ['A'], ok: 0 } })).toBeNull();
  });
});
