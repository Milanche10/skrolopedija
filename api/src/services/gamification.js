import { prisma } from '../lib/prisma.js';

// Nivoi (prag XP-a). XP se računa iz aktivnosti — bez posebne tabele.
const LEVELS = [
  { name: 'Novajlija', min: 0, icon: '🌱' },
  { name: 'Istraživač', min: 100, icon: '🧭' },
  { name: 'Učenik', min: 300, icon: '📗' },
  { name: 'Profesor', min: 700, icon: '🎓' },
  { name: 'Majstor', min: 1500, icon: '🧠' },
  { name: 'Mudrac', min: 3000, icon: '🦉' },
  { name: 'Legenda', min: 6000, icon: '👑' },
];

export function levelFor(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const span = next ? next.min - cur.min : 1;
  return {
    index: idx,
    name: cur.name,
    icon: cur.icon,
    xpInLevel: xp - cur.min,
    xpForNext: next ? span : 0,
    progressPct: next ? Math.round(((xp - cur.min) / span) * 100) : 100,
    next: next ? { name: next.name, icon: next.icon, at: next.min, xpNeeded: next.min - xp } : null,
  };
}

/** XP formula: viđene ×2, tačan kviz ×10, sačuvano ×5, streak ×20. */
export function xpFrom({ seen, quizCorrect, saved, streak }) {
  return seen * 2 + quizCorrect * 10 + saved * 5 + streak * 20;
}

export async function computeStats() {
  const state = await prisma.userState.findUnique({ where: { id: 1 } });
  const streak = state?.streakCount || 0;
  const [seen, saved, quizTotal, quizCorrect] = await Promise.all([
    prisma.seenCard.count(),
    prisma.savedCard.count(),
    prisma.quizAnswer.count(),
    prisma.quizAnswer.count({ where: { correct: true } }),
  ]);

  const xp = xpFrom({ seen, quizCorrect, saved, streak });
  const level = levelFor(xp);

  // Knowledge heatmap: po kategoriji viđene / ukupno aktivnih
  const cats = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const heatmap = await Promise.all(
    cats.map(async (c) => {
      const [total, seenInCat] = await Promise.all([
        prisma.card.count({ where: { categoryId: c.id, isActive: true } }),
        prisma.seenCard.count({ where: { card: { categoryId: c.id } } }),
      ]);
      const shown = Math.min(seenInCat, total || seenInCat);
      return {
        categoryId: c.id,
        label: c.label,
        color: c.color,
        icon: c.icon,
        seen: seenInCat,
        total,
        pct: total ? Math.round((shown / total) * 100) : seenInCat > 0 ? 100 : 0,
      };
    })
  );

  const categoriesTouched = heatmap.filter((h) => h.seen > 0).length;
  const bestCat = heatmap.reduce((m, h) => Math.max(m, h.seen), 0);
  const accuracy = quizTotal ? quizCorrect / quizTotal : 0;

  const defs = [
    { key: 'first', icon: '👣', label: 'Prvi korak', desc: 'Pročitaj prvu karticu', cur: seen, target: 1 },
    { key: 'reader100', icon: '📖', label: 'Čitač', desc: '100 pročitanih kartica', cur: seen, target: 100 },
    { key: 'reader500', icon: '📚', label: 'Knjiški moljac', desc: '500 pročitanih kartica', cur: seen, target: 500 },
    { key: 'streak7', icon: '🔥', label: 'Nedelja', desc: '7 dana zaredom', cur: streak, target: 7 },
    { key: 'streak30', icon: '🏆', label: 'Mesec discipline', desc: '30 dana zaredom', cur: streak, target: 30 },
    { key: 'quiz50', icon: '✅', label: 'Kvizolog', desc: '50 tačnih odgovora', cur: quizCorrect, target: 50 },
    { key: 'sharp', icon: '🎯', label: 'Oštar um', desc: '80% tačnosti (min. 20 kvizova)', cur: quizTotal >= 20 ? Math.round(accuracy * 100) : 0, target: 80 },
    { key: 'collector', icon: '❤️', label: 'Kolekcionar', desc: '25 sačuvanih kartica', cur: saved, target: 25 },
    { key: 'explorer', icon: '🧭', label: 'Istraživač', desc: 'Zaviri u 10 oblasti', cur: categoriesTouched, target: 10 },
    { key: 'catmaster', icon: '🧠', label: 'Ekspert oblasti', desc: '20 kartica u jednoj oblasti', cur: bestCat, target: 20 },
  ];
  const achievements = defs.map((a) => ({
    key: a.key,
    icon: a.icon,
    label: a.label,
    desc: a.desc,
    cur: a.cur,
    target: a.target,
    earned: a.cur >= a.target,
    progressPct: Math.min(100, Math.round((a.cur / a.target) * 100)),
  }));

  return {
    xp,
    level,
    totals: { seen, saved, quizTotal, quizCorrect, streak, accuracy: Math.round(accuracy * 100), categoriesTouched },
    achievements,
    heatmap,
  };
}
