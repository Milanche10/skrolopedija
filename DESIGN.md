# DESIGN.md — Skrolopedija

## Boje (OKLCH, dark)
- `--bg`        oklch(0.13 0.012 285)  — telo, gotovo crno sa ljubičastim dahom
- `--surface`   oklch(0.18 0.014 285)  — paneli, sheet
- `--surface-2` oklch(0.22 0.016 285)  — inputi, hover
- `--ink`       oklch(0.96 0.005 285)  — primarni tekst
- `--ink-2`     oklch(0.82 0.01 285)   — telo kartice
- `--muted`     oklch(0.68 0.015 285)  — sekundarni tekst (kontrast ≥4.5:1 na --bg)
- `--line`      oklch(0.30 0.015 285)  — granice
- `--accent`    oklch(0.62 0.21 295)   — akcije, fokus (ljubičasta brenda)
- `--danger`    oklch(0.6 0.21 25) · `--ok` oklch(0.7 0.17 155)
- Boja kategorije dolazi iz baze (hex) i nosi karticu: radijalni gradijent + rikna + prsten.

## Tipografija
- Jedna familija: **Inter** (400/500/600/800), system-ui fallback.
- Feed naslov: 800, clamp(26px → 40px), letter-spacing -0.025em, text-wrap: balance.
- Telo kartice: 17–19px / 1.6, max 34ch. Admin: 14px baza, skala 1.125.

## Prostor i oblik
- Radius: 10px (kontrole), 14px (kartice/paneli), pill za chipove. Ništa preko 20px.
- Spacing baza 4px; feed padding clamp(24–56px).
- Z-skala: rail 5 < topbar 20 < sheet 40 < toast 60.

## Motion (150–250ms, ease-out-quint; reduced-motion: sve na fade/instant)
- Ulazak kartice: fade + 16px translateY, 260ms.
- Srce (dupli tap): burst 600ms. Sheet: slide-up 240ms. Ostalo: 160ms fade/scale.

## Komponente — vokabular
- Dugmad: `primary` (accent, beli tekst), `ghost` (surface-2 + line), `danger`. Ista visina 36px u adminu.
- Chip/pill: pozadina rgba(255,255,255,.08) + blur na feedu; solid surface-2 u adminu.
- Status bedževi knjiga: done/processing/failed/uploaded — uvek istim bojama.
- Story krug: 60px, prsten = conic gradijent boje kategorije; aktivan = pun prsten + labela ink.

## Responsive struktura
- ≤ 640px: sve puna širina (primarni target).
- > 900px: feed kolona max 520px centrirana; pozadina = zamućen glow boje aktivne kartice;
  stories traka centrirana na istu širinu; rail unutar kolone.
- Admin > 900px: max 1100px; ≤ 700px: tabele u horizontalnom scroll wrapperu, forme se slažu.
