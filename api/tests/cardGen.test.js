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

describe('cleanCards — mapira srpska imena polja + filter kvaliteta', () => {
  const dobarTekst =
    'Degustacija vina počinje pogledom na boju i bistrinu, zatim se procenjuje aroma, pa tek onda ukus i završnica. Svaki korak otkriva drugu osobinu vina i traži malo strpljenja.';

  it('mapira naslov/tekst i podrazumeva type=lesson', () => {
    const out = cleanCards([{ naslov: 'Kako se degustira vino', tekst: dobarTekst }]);
    expect(out).toEqual([{ title: 'Kako se degustira vino', text: dobarTekst, type: 'lesson' }]);
  });

  it('poštuje type=fact', () => {
    const out = cleanCards([{ title: 'Zašto je more slano', text: dobarTekst, type: 'fact' }]);
    expect(out[0].type).toBe('fact');
  });

  it('odbacuje kratke, prazne i generičke kartice', () => {
    const out = cleanCards([
      { title: 'Dobra', text: dobarTekst }, // ok
      { title: 'Prekratko', text: 'Samo par reči.' }, // < 120 znakova
      { title: 'Bez teksta' },
      { text: 'bez naslova, ali dovoljno dug tekst koji ipak nema naslov pa se odbacuje bez obzira na dužinu ovoga.' },
      { title: 'Lekcija 1', text: dobarTekst }, // generički naslov
    ]);
    expect(out.map((c) => c.title)).toEqual(['Dobra']);
  });

  it('uklanja duplikate naslova unutar iste serije', () => {
    const out = cleanCards([
      { title: 'Ista tema', text: dobarTekst },
      { title: 'ISTA  tema', text: dobarTekst },
    ]);
    expect(out).toHaveLength(1);
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
