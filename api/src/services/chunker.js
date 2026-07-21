/**
 * Podela teksta knjige na segmente sa preklapanjem, uz praćenje raspona strana.
 * Veličina segmenta je podesiva (manja za provajdere sa niskim TPM limitom, npr. Groq free).
 */
const DEFAULT_TARGET_CHARS = 16000; // ~4000 tokena
const OVERLAP_CHARS = 800;

/**
 * @param {string[]} pages tekst po stranama (1 element ako strane nisu poznate)
 * @param {number} [targetChars] ciljna veličina segmenta u znakovima
 * @returns {{text: string, startPage: number|null, endPage: number|null}[]}
 */
export function chunkPages(pages, targetChars = DEFAULT_TARGET_CHARS) {
  const TARGET_CHARS = Math.max(1000, targetChars);
  const MAX_CHARS = Math.round(TARGET_CHARS * 1.25);
  // spoji strane i zapamti gde koja počinje
  const offsets = []; // offsets[i] = početni offset strane i+1
  let full = '';
  for (const p of pages) {
    offsets.push(full.length);
    full += p.trimEnd() + '\n\n';
  }
  const hasPages = pages.length > 1;

  const chunks = [];
  let pos = 0;
  while (pos < full.length) {
    let end = Math.min(pos + TARGET_CHARS, full.length);
    if (end < full.length) {
      // probaj da presečeš na granici pasusa, pa rečenice
      const window = full.slice(end, Math.min(pos + MAX_CHARS, full.length));
      const para = window.indexOf('\n\n');
      if (para >= 0) end += para;
      else {
        const sentence = window.search(/[.!?]\s/);
        if (sentence >= 0) end += sentence + 1;
        else end = Math.min(pos + MAX_CHARS, full.length);
      }
    }
    const text = full.slice(pos, end).trim();
    if (text.length > 200) {
      chunks.push({
        text,
        startPage: hasPages ? offsetToPage(offsets, pos) : null,
        endPage: hasPages ? offsetToPage(offsets, end - 1) : null,
      });
    }
    if (end >= full.length) break;
    pos = Math.max(pos + 1, end - OVERLAP_CHARS);
  }
  return chunks;
}

function offsetToPage(offsets, offset) {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // strane su 1-bazirane
}
