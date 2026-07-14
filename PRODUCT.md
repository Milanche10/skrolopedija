# PRODUCT.md — Skrolopedija

## Šta je proizvod
Aplikacija za mikroučenje kroz vertikalno skrolovanje (Instagram Reels za znanje). Korisnik
skroluje kartice-lekcije preko celog ekrana iz raznih oblasti i iz sopstvenih knjiga (PDF/DOCX)
koje AI pretvara u kartice. Single-user, srpski jezik (latinica).

## Korisnik i scena
Jedan korisnik (vlasnik), pretežno na **telefonu**: uveče u krevetu, u prevozu, u pauzi —
ambijent je taman, sesije kratke (2–10 min), palac na ekranu. Desktop se koristi povremeno,
uglavnom za admin. → **Tamna tema je prirodan izbor, ne estetska poza.**

## Register
- **Feed** (`/`): content-first potrošačka površina — kartica je scena, boja kategorije nosi
  identitet (Committed strategija boje). Poznata gramatika vertikalnih video appova
  (stories traka, akcije desno, snap-scroll).
- **Admin** (`/admin`): product register — Restrained, gustina, konzistentne komponente,
  bez dekoracije.

## Identitet
- **Rikna (spine)** uz levu ivicu kartice u boji kategorije — nasleđe prototipa i namerni
  brend-element (kartica = list iz knjige). Zadržati uvek.
- Boja kategorije prožima karticu (gradijent pozadine, prsten na story krugu, chip).
- Ton: radoznao, jasan, bez infantilnosti. Emoji su deo vokabulara kategorija.

## Ključne površine
1. Feed: fullscreen kartice, scroll-snap, stories traka, filter sheet, action rail
   (srce/deljenje/izvor), streak 🔥, brojač pozicije, pull-to-refresh, kviz kartice.
2. Admin: tabele kategorija/kartica, knjige sa progresom obrade, AI/Web dugmad.

## Tehnička ograničenja
- React + Vite, čist CSS (bez UI framework-a). Sve iz API-ja, ništa hardkodirano.
- Mobile-first; desktop = centrirana kolona feeda (max ~520px) sa ambijentalnom pozadinom.
- `prefers-reduced-motion` se poštuje svuda.
