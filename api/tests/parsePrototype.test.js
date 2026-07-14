import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { parsePrototype, extractBalanced, extractVariable } from '../scripts/parsePrototype.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, 'fixtures/prototype.html');

describe('extractBalanced', () => {
  it('poštuje zagrade unutar stringova i komentara', () => {
    const src = 'x = [1, "a]b", /* ] */ 3] rest';
    const lit = extractBalanced(src, src.indexOf('['));
    expect(lit).toBe('[1, "a]b", /* ] */ 3]');
  });

  it('rukuje ugnježdenim objektima', () => {
    const src = 'const o = { a: [1, { b: 2 }], c: "}" };';
    const lit = extractBalanced(src, src.indexOf('{'));
    expect(lit).toBe('{ a: [1, { b: 2 }], c: "}" }');
  });
});

describe('extractVariable', () => {
  it('izvlači objekat CATS iz HTML izvora', () => {
    const src = 'foo; const CATS = { a: "#111" }; bar;';
    expect(extractVariable(src, 'CATS')).toEqual({ a: '#111' });
  });
});

describe('parsePrototype', () => {
  it('parsira kategorije u različitim oblicima', () => {
    const { cats } = parsePrototype(FIXTURE);
    const byKey = Object.fromEntries(cats.map((c) => [c.key, c]));
    expect(byKey.istorija).toMatchObject({ label: 'Istorija', color: '#f59e0b', icon: '🏛️' });
    expect(byKey.kosmos).toMatchObject({ label: 'Kosmos', color: '#3b82f6', icon: '🚀' });
    expect(byKey.nauka).toMatchObject({ color: '#10b981' });
  });

  it('parsira kartice sa tipovima, kvizom i book poljem', () => {
    const { cards } = parsePrototype(FIXTURE);
    expect(cards).toHaveLength(4);
    const quiz = cards.find((c) => c.type === 'quiz');
    expect(quiz.quiz).toEqual({ q: 'Formula vode?', opts: ['H2O', 'CO2', 'O2', 'NaCl'], ok: 0, expl: 'Voda je H2O.' });
    const bookCard = cards.find((c) => c.book);
    expect(bookCard.book).toBe('Umeće ratovanja');
    // kartica bez eksplicitnog type-a i bez kviza je 'lesson'
    const lesson = cards.find((c) => c.title === 'Brzina svetlosti');
    expect(lesson.type).toBe('lesson');
  });
});
