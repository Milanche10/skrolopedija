# Skrolopedija — Roadmap ideja

Vizija: **TikTok × Duolingo × Anki** — skrolovanje kao interfejs za adaptivno učenje.
Ne „TikTok za činjenice", nego sistem koji prati šta razumeš/zaboravljaš i optimizuje feed.

Legenda statusa: ✅ urađeno · 🟢 brzo (1 iteracija) · 🟡 srednje · 🔴 veliko/ambiciozno
Princip: primenjujemo jednu po jednu; gde već imamo bolje rešenje — ostaje naše.

---

## 0. Već implementirano (osnova)
- ✅ Infinite Learning Feed (scroll-snap, jedna kartica = jedna ideja)
- ✅ Mikro-kvizovi svakih ~9 kartica
- ✅ Save / Favorites (❤️), streak, brojač pozicije, pull-to-refresh
- ✅ Konstantno AI generisanje za sve kategorije osim „Knjige" (efemerne kartice, upis tek na favorite)
- ✅ AI generisanje po kategoriji („AI +5") + web-prikupljanje (Wikipedia, „Na današnji dan")
- ✅ Obrada knjiga (PDF/DOCX) → kartice, lokalno u Neon (Ollama), sa filterom kvaliteta
- ✅ Bolji model (Groq llama-3.3-70b), parafraza, srpski latinica
- ✅ Responsive (telefon + desktop kolona), tamna tema, „beautiful cards" (premium dizajn)
- ✅ Live & secure na https://digitalnizenit.org

---

## 1. Adaptivno učenje — SRŽ „wow" faktora (najveći prioritet)
Ovo je ono što razlikuje Skrolopediju od „TikTok-a za činjenice".
- ✅ **Swipe signali**: swipe levo = „ne razumem", desno = „znam" (+ dugmad za desktop). Beleži se `CardSignal`.
- ✅ **Dwell-time („AI Reading Mind")**: meri se vreme na kartici → pasivni „skip" signal.
- ✅ **Adaptivni redosled (fresh)**: sveže generisanje ponderisano — više iz oblasti koje slabije znaš; kviz je takođe signal.
- ✅ **Spaced repetition (Anki SM-2)**: pogrešan kviz se vraća za ~10 min, tačan sve ređe (1→3→×ease dana). Filter „🔁 Ponavljanje (N)".
- ✅ **Ponovi pogrešan kviz**: ista kartica se vrati po SR rasporedu (deo gornjeg).
- 🟡 **AI Tutor predlozi**: posle N kartica „Ide ti biologija — pređi na genetiku?"

## 2. Dopaminske mehanike (drže pažnju)
- ✅ **„Da li znaš da…" / Mind-Blown kartice**: ~svaka 3. sveža tura je 🤯 iznenađujuća činjenica (poseban stil).
- ✅ **Rabbit Hole / „Saznaj više"**: dugme → AI generiše dublje kartice o temi i ubaci ih odmah ispod.
- 🟢 **Mystery Card**: jedna dnevno, ne znaš temu dok ne otvoriš.
- 🟢 **Lucky Scroll / Random Topic Challenge**: dugme „potpuno nova tema danas".
- 🟡 **Puzzle Feed**: kartica daje trag, odgovor tek posle par kartica.
- 🟡 **Detective / „Pogodi ko/šta"**: tragovi → pogodi ličnost/državu/događaj.
- 🟢 **Streak sa brojem**: ne „7 dana" nego „danas naučio 83 nove činjenice".

## 3. Gejmifikacija i napredak
- ✅ **XP + Leveli** (Novajlija → Istraživač → Učenik → Profesor → Majstor → Mudrac → Legenda) — na `/profile`.
- ✅ **Achievements/bedževi** (10 bedževa: 100/500 kartica, 7/30 dana, 50 tačnih, kolekcionar, ekspert oblasti…).
- ✅ **Knowledge Heatmap** (mapa znanja po kategoriji) — na `/profile`.
- ✅ **Level-up toast**: proslava kad se pređe nivo (posle kviza/čuvanja).
- 🟢 **Bedž toast**: obavesti i kad se zaradi konkretan bedž (sledeći mali korak).
- 🟡 **Boss Fight**: 20 pitanja na kraju oblasti → bedž.
- 🟡 **Daily Challenge**: 20 kartica + 5 kvizova + 3 nove oblasti = XP.
- 🔴 **Global Leaderboard** (Top % po oblasti) — traži multi-user (za sada single-user).

## 4. Profil znanja (potencijalni zaštitni znak)
- 🔴 **Knowledge DNA** ⭐: profil tipa „34% Tehnologija, 21% Istorija…", šta najbrže usvajaš/zaboravljaš,
  koliko si radoznao, promena kroz vreme. Deljivo na mrežama → organski rast.
- 🟡 **Knowledge Heatmap („IQ Heatmap")**: bar-mapa znanja po oblastima (Istorija ███████░░).
- 🟡 **Interesovanja → personalizovani feed**: biraš teme, AI pravi feed.

## 5. Tipovi sadržaja (više čula = bolje pamćenje)
- ✅ **„Objasni kao da imam 10 godina" / „Primer iz života" / „Dublje"**: dugme 💡 na kartici → AI modal.
- 🟡 **Slike / ilustracije po kartici** (AI ili stock; pažljivo sa troškom/pravima).
- 🟡 **Audio feed (15s / podcast mod)**: TTS čita kartice, skroluješ dok voziš.
- 🟡 **Grafici / mape / timeline** za pogodne teme.
- 🟡 **Story Mode**: učiš kroz priču („Jedan vojnik 1812…") umesto suvih činjenica.
- 🟡 **„Celebrity/stil objašnjenja"**: ista lekcija kao strogi profesor / komentator / komičar (bez lažnog predstavljanja stvarnih osoba).
- 🟡 **Debate Mode**: AI brani suprotno mišljenje, ti argumentuješ (tekst/glas).

## 6. Posebni feedovi (tematski)
- 🟢 **„Na današnji dan / Live Knowledge"**: već imamo web-collect; izložiti kao poseban feed.
- 🟡 **Time Machine**: skrol kroz godine (500 p.n.e. → 2026) kao timeline.
- 🟡 **Universe Feed**: od atoma do vidljivog svemira (zoom skala).
- 🟡 **Explore the World**: klik na državu → feed (istorija, kultura, ekonomija).
- 🟡 **„Šta bi bilo da…"**: AI simulira alternativnu istoriju.

## 7. Unos i „scan anything"
- 🟢 **Scan/Upload → feed**: već radi za PDF/DOCX; dodati slike (OCR) i „slikaj stranu".
- 🔴 **Camera Learn**: usmeriš kameru na biljku/predmet → AI kartice (vision model).
- 🔴 **AI Creator „napravi kurs o X"**: AI napravi 150 kartica + kvizove + progres za zadatu temu.

## 8. Udobnost
- 🟡 **Offline Mode**: skini N kartica, uči bez neta.
- 🟢 **Ambijentalni zvuci** (kiša, biblioteka, svemir) dok učiš.
- 🟢 **Save for Later** (odvojeno od Favorites) — kartice za ponavljanje.
- 🟢 **Scroll Speed check**: ako preletiš prebrzo → „Da li stvarno čitaš?"

---

## Predlog redosleda (naredne iteracije)
1. **Swipe levo/desno + dwell-time → signali** (temelj za sve adaptivno). 🟡
2. **Spaced repetition motor** koji koristi te signale + kviz greške. 🔴 (u koracima)
3. **„Objasni kao da imam 10 / primer iz života"** dugme. 🟢 (brz „wow", koristi postojeći AI)
4. **„Da li znaš da…" + Mystery Card + Streak-sa-brojem**. 🟢 (dopamin, malo koda)
5. **XP/Leveli/Achievements + Knowledge Heatmap**. 🟢–🟡
6. **Knowledge DNA** kao kruna profila. 🔴

> Napomena o trošku: sve što zove AI uživo mora da poštuje Groq free limit (6000 TPM) —
> batch generisanje + keš, degradacija na postojeće kartice kad AI nije dostupan (već tako radi).
