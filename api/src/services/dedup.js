const DIAC = { š: 's', đ: 'dj', č: 'c', ć: 'c', ž: 'z' };

export function normalizeTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[šđčćž]/g, (c) => DIAC[c])
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jaccard sličnost skupova reči dva naslova. */
export function titleSimilarity(a, b) {
  const wa = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const wb = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

/** Da li je naslov duplikat nekog iz postojeće liste (prag 0.7). */
export function isDuplicateTitle(title, existingTitles, threshold = 0.7) {
  const norm = normalizeTitle(title);
  for (const t of existingTitles) {
    if (normalizeTitle(t) === norm) return true;
    if (titleSimilarity(title, t) >= threshold) return true;
  }
  return false;
}
