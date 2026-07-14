// Pomoćne funkcije za rad sa bojama kategorija.
export function hexToRgb(hex) {
  const h = (hex || '#8b5cf6').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Gradijent pozadine u boji kategorije — boja nosi karticu (Committed strategija).
export function categoryGlow(hex) {
  return {
    background: [
      `radial-gradient(130% 100% at 15% 0%, ${rgba(hex, 0.55)} 0%, ${rgba(hex, 0.22)} 40%, transparent 75%)`,
      `radial-gradient(120% 80% at 100% 100%, ${rgba(hex, 0.18)} 0%, transparent 60%)`,
      `linear-gradient(170deg, ${rgba(hex, 0.1)}, rgba(10,10,14,0.3))`,
    ].join(', '),
  };
}
