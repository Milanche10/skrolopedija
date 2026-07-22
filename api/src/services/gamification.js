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

export async function computeStats(userId) {
  const [state, account] = await Promise.all([
    prisma.userState.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { flags: true, createdAt: true } }),
  ]);
  const streak = state?.streakCount || 0;
  const flags = account?.flags || {};
  const [seen, saved, quizTotal, quizCorrect] = await Promise.all([
    prisma.seenCard.count({ where: { userId } }),
    prisma.savedCard.count({ where: { userId } }),
    prisma.quizAnswer.count({ where: { userId } }),
    prisma.quizAnswer.count({ where: { userId, correct: true } }),
  ]);

  const xp = xpFrom({ seen, quizCorrect, saved, streak });
  const level = levelFor(xp);

  // Knowledge heatmap: po kategoriji viđene / ukupno aktivnih
  const cats = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const heatmap = await Promise.all(
    cats.map(async (c) => {
      const [total, seenInCat] = await Promise.all([
        prisma.card.count({ where: { categoryId: c.id, isActive: true } }),
        prisma.seenCard.count({ where: { userId, card: { categoryId: c.id } } }),
      ]);
      const shown = Math.min(seenInCat, total || seenInCat);
      return {
        categoryId: c.id,
        key: c.key,
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

  const allCatsN = heatmap.length || 1;
  const perfectCur = quizTotal >= 30 && quizCorrect === quizTotal ? 100 : 0;
  // egg(key) → bedž koji se otključava easter-eggom (skriven dok se ne otkrije)
  const egg = (val) => (flags && flags[val] ? 1 : 0);
  const defs = [
    { key: 'first', icon: '👣', label: 'Prvi korak', desc: 'Pročitaj prvu karticu', cur: seen, target: 1 },
    { key: 'reader100', icon: '📖', label: 'Čitač', desc: '100 pročitanih kartica', cur: seen, target: 100 },
    { key: 'reader500', icon: '📚', label: 'Knjiški moljac', desc: '500 pročitanih kartica', cur: seen, target: 500 },
    { key: 'reader1000', icon: '📜', label: 'Aleksandrijski svitak', desc: '1000 pročitanih kartica', cur: seen, target: 1000 },
    { key: 'streak7', icon: '🔥', label: 'Nedelja', desc: '7 dana zaredom', cur: streak, target: 7 },
    { key: 'streak30', icon: '🏆', label: 'Mesec discipline', desc: '30 dana zaredom', cur: streak, target: 30 },
    { key: 'streak100', icon: '💎', label: 'Dijamant volje', desc: '100 dana zaredom', cur: streak, target: 100, hidden: true },
    { key: 'quiz50', icon: '✅', label: 'Kvizolog', desc: '50 tačnih odgovora', cur: quizCorrect, target: 50 },
    { key: 'quiz200', icon: '🧾', label: 'Kviz automat', desc: '200 tačnih odgovora', cur: quizCorrect, target: 200 },
    { key: 'sharp', icon: '🎯', label: 'Oštar um', desc: '80% tačnosti (min. 20 kvizova)', cur: quizTotal >= 20 ? Math.round(accuracy * 100) : 0, target: 80 },
    { key: 'perfect', icon: '💯', label: 'Bez greške', desc: '100% tačnosti (min. 30 kvizova)', cur: perfectCur, target: 100, hidden: true },
    { key: 'collector', icon: '❤️', label: 'Kolekcionar', desc: '25 sačuvanih kartica', cur: saved, target: 25 },
    { key: 'collector100', icon: '🐉', label: 'Zmaj čuvar blaga', desc: '100 sačuvanih kartica', cur: saved, target: 100 },
    { key: 'explorer', icon: '🧭', label: 'Istraživač', desc: 'Zaviri u 10 oblasti', cur: categoriesTouched, target: 10 },
    { key: 'allcats', icon: '🌍', label: 'Renesansni um', desc: 'Dotakni SVE oblasti', cur: categoriesTouched, target: allCatsN, hidden: true },
    { key: 'catmaster', icon: '🧠', label: 'Ekspert oblasti', desc: '20 kartica u jednoj oblasti', cur: bestCat, target: 20 },
    { key: 'catmaster50', icon: '🏅', label: 'Gospodar oblasti', desc: '50 kartica u jednoj oblasti', cur: bestCat, target: 50 },
    // 🥚 Easter egg-ovi (skriveni — otključavaju se tajnim akcijama)
    { key: 'konami', icon: '🎮', label: 'Konami', desc: '↑↑↓↓←→←→ B A', cur: egg('konami'), target: 1, hidden: true },
    { key: 'zenit', icon: '🛸', label: 'Digitalni Zenit', desc: 'Otkrio tajnu Zenita', cur: egg('zenit'), target: 1, hidden: true },
  ];
  const achievements = defs.map((a) => {
    const earned = a.cur >= a.target;
    return {
      key: a.key,
      icon: a.icon,
      label: a.label,
      desc: a.desc,
      cur: a.cur,
      target: a.target,
      earned,
      hidden: Boolean(a.hidden) && !earned, // skriveni se otkrivaju tek kad se osvoje
      progressPct: Math.min(100, Math.round((a.cur / a.target) * 100)),
    };
  });

  // 🧬 Knowledge DNA — raspodela viđenih kartica po oblasti (%)
  const totalSeenAll = heatmap.reduce((s, h) => s + h.seen, 0) || 1;
  const dna = heatmap
    .filter((h) => h.seen > 0)
    .map((h) => ({ label: h.label, color: h.color, icon: h.icon, pct: Math.round((h.seen / totalSeenAll) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  // 🧬 Brain Genome — „sekvence" osobina po grupama oblasti
  const TRAITS = [
    { code: 'LOG', label: 'Logika', keys: ['programiranje', 'racunarske-mreze', 'vestacka-inteligencija', 'digitalna-forenzika', 'sajber-bezbednost', 'internet'] },
    { code: 'SCI', label: 'Nauka', keys: ['nauka', 'kosmos', 'ljudsko-telo', 'zivotinje', 'dinosaurusi', 'zdravlje', 'geografija'] },
    { code: 'HIS', label: 'Istorija', keys: ['istorija', 'mitologija', 'filozofija'] },
    { code: 'SOC', label: 'Društvo', keys: ['psihologija', 'biznis', 'marketing', 'ekonomija', 'finansije', 'produktivnost'] },
    { code: 'CRE', label: 'Kreativa', keys: ['umetnost', 'mitologija', 'prezivljavanje'] },
  ];
  const seenByKey = Object.fromEntries(heatmap.map((h) => [h.key, h.seen]));
  const genome = TRAITS.map((t) => {
    const sum = t.keys.reduce((s, k) => s + (seenByKey[k] || 0), 0);
    const raw = sum / totalSeenAll; // 0..1 udeo
    return { code: t.code, label: t.label, score: Math.min(99, Math.round(raw * 150)) };
  });
  // CUR — radoznalost: širina istraživanja + aktivnost
  const breadth = categoriesTouched / Math.max(6, heatmap.length);
  const curiosity = Math.min(99, Math.round(breadth * 80 + Math.min(19, seen / 8)));
  genome.push({ code: 'CUR', label: 'Radoznalost', score: curiosity });

  const earnedCount = achievements.filter((a) => a.earned).length;

  return {
    xp,
    level,
    totals: { seen, saved, quizTotal, quizCorrect, streak, accuracy: Math.round(accuracy * 100), categoriesTouched, badges: earnedCount },
    achievements,
    heatmap,
    dna,
    genome,
    curiosity,
  };
}

/**
 * Rang lista svih (ne-gost) korisnika po XP-u. Efikasno: agregati groupBy umesto
 * pune computeStats po useru. Vraća ceo sortiran niz sa rank-om (baza je mala).
 */
export async function leaderboard() {
  const [users, states, seenG, savedG, correctG] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: 'guest' } }, select: { id: true, username: true, firstName: true } }),
    prisma.userState.findMany({ select: { userId: true, streakCount: true } }),
    prisma.seenCard.groupBy({ by: ['userId'], _count: { _all: true } }),
    prisma.savedCard.groupBy({ by: ['userId'], _count: { _all: true } }),
    prisma.quizAnswer.groupBy({ by: ['userId'], where: { correct: true }, _count: { _all: true } }),
  ]);
  const streakMap = Object.fromEntries(states.map((s) => [s.userId, s.streakCount || 0]));
  const seenMap = Object.fromEntries(seenG.map((g) => [g.userId, g._count._all]));
  const savedMap = Object.fromEntries(savedG.map((g) => [g.userId, g._count._all]));
  const correctMap = Object.fromEntries(correctG.map((g) => [g.userId, g._count._all]));

  return users
    .map((u) => {
      const seen = seenMap[u.id] || 0;
      const saved = savedMap[u.id] || 0;
      const quizCorrect = correctMap[u.id] || 0;
      const streak = streakMap[u.id] || 0;
      const xp = xpFrom({ seen, quizCorrect, saved, streak });
      const lvl = levelFor(xp);
      return { userId: u.id, username: u.username, name: u.firstName || u.username, xp, streak, levelName: lvl.name, levelIcon: lvl.icon };
    })
    .filter((r) => r.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .map((r, i) => ({ rank: i + 1, ...r }));
}
