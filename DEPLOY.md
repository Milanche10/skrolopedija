# Deploy — digitalnizenit.org (100% besplatno)

Arhitektura u produkciji (sve free tier, bez kartice):

| Deo | Servis | Zašto |
|---|---|---|
| Frontend | **Netlify** | besplatan hosting + custom domen + HTTPS + proxy ka API-ju |
| API | **Render** (free web service) | jedini pravi besplatan Node hosting sa Docker-om |
| Baza | **Neon** (free Postgres) | besplatan Postgres koji ne ističe (za razliku od Render-ovog) |
| AI | **Groq** (free API) | isti llama-3.1-8b model kao lokalna Ollama, samo u oblaku, besplatno |

> Napomena o free tier-u: Render servis "zaspi" posle 15 min neaktivnosti — prvo otvaranje
> posle pauze traje ~30-50s dok se probudi. Upload knjiga na Renderu je efemeran (fajl nestaje
> pri restartu), ali IZVUČENE KARTICE ostaju u bazi — obradi knjigu do kraja i sadržaj je trajan.

## 0. GitHub (jednom)

```bash
# u terminalu, u folderu projekta:
gh auth login          # izaberi GitHub.com → HTTPS → Login with a web browser
gh repo create skrolopedija --public --source . --push
```

(Repo je već commit-ovan lokalno; `Baza znanja/` je u .gitignore — knjige ne idu na GitHub.)

## 1. Neon — baza (2 min)

1. https://neon.tech → Sign up (GitHub nalog) → **Create project** (ime: `skrolopedija`, region: EU).
2. Kopiraj **Connection string** (Pooled) — izgleda ovako:
   `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

## 2. Groq — AI ključ (1 min)

1. https://console.groq.com → Sign up → **API Keys** → Create key.
2. Sačuvaj ključ (`gsk_...`).

## 3. Render — API (5 min)

1. https://render.com → Sign up (GitHub nalog) → **New → Blueprint** → izaberi repo `skrolopedija`.
   Render pročita `render.yaml` i ponudi servis `skrolopedija-api`.
2. Kad zatraži env promenljive:
   - `DATABASE_URL` = Neon connection string (korak 1) — **direktan** (bez `-pooler` u hostu)
   - `OPENAI_API_KEY` = Groq ključ (korak 2)
3. Deploy. Kad se završi, proveri: `https://skrolopedija-api.onrender.com/health`
   → treba `{"ok":true,"aiReady":true,...}`. Migracije i seed idu automatski pri startu.
4. Ako je Render dodelio drugačiji URL, upiši ga u `netlify.toml` (redirect `to`) i push-uj.

**Ako si servis napravio ručno** (New → Web Service, bez Blueprint-a), Dockerfile nije u korenu
repo-a pa build pada sa „open Dockerfile: no such file or directory". U **Settings → Build & Deploy** podesi:

| Polje | Vrednost |
|---|---|
| Dockerfile Path | `./api/Dockerfile` |
| Docker Build Context Directory | `./api` |
| Docker Command | `sh -c "npx prisma migrate deploy && (node scripts/seed.js || true) && npm start"` |
| Health Check Path | `/health` |

i u **Environment** dodaj: `DATABASE_URL`, `AI_PROVIDER=openai`,
`OPENAI_BASE_URL=https://api.groq.com/openai/v1`, `OPENAI_API_KEY`,
`OPENAI_MODEL=llama-3.1-8b-instant`, `AUTO_PROCESS_ON_STARTUP=false` → **Manual Deploy → Deploy latest commit**.

## 4. Netlify — frontend + domen (5 min)

1. https://app.netlify.com → Sign up (GitHub nalog) → **Add new site → Import from Git** → repo.
   Netlify pročita `netlify.toml` (build iz `web/`, publish `dist`). Deploy.
2. **Domain management → Add custom domain** → `digitalnizenit.org` (+ `www.digitalnizenit.org`).
3. Kod svog registrara domena podesi DNS (jedna od dve opcije):
   - **Preporučeno**: prebaci nameservere na Netlify DNS (Netlify ti ispiše 4 NS zapisa).
   - Ili ručno: `A` zapis za apex `digitalnizenit.org` → `75.2.60.5`,
     `CNAME` za `www` → `<ime-sajta>.netlify.app`.
4. Netlify automatski izda HTTPS sertifikat (Let's Encrypt) čim DNS proradi (do 24h, obično minuti).

## 5. Provera

- `https://digitalnizenit.org` → feed radi (kartice iz Neon baze).
- `https://digitalnizenit.org/admin` → admin; AI status treba da bude `openai · llama-3.1-8b-instant ✅`.
- „✨ AI +5" na kategoriji → nove kartice preko Groq-a.

## Knjige u produkciji — obradi lokalno, kartice idu u Neon

Knjige (PDF/DOCX) ne šalju se na server: fajlovi su pod autorskim pravima, Render free nema
trajni disk, a Groq bi obradu naplaćivao kroz limite. Umesto toga, **obrada ide lokalno
(besplatna Ollama), a kartice se upisuju direktno u produkcijsku bazu**:

**Preporučeno — kroz Groq (brzo):** Ollama na CPU je spora (~5 tokena/s → velike knjige traju
satima). Groq radi isti model ~100x brže i besplatan je, pa je za obradu praktičniji. Tekst
odlomaka ide Groq-u (parafraza), ali PDF fajl ostaje kod tebe.

```bash
# 1. ubaci knjige u folder "Baza znanja/"
# 2. obradi ih kroz Groq, upiši kartice u Neon (zameni oba stringa svojim):
docker compose run --rm \
  -e DATABASE_URL="postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require&connect_timeout=15" \
  -e AI_PROVIDER=openai \
  -e OPENAI_API_KEY="gsk_...tvoj-groq-kljuc..." \
  api node scripts/processBooks.js
```

**Alternativa — potpuno lokalno (Ollama):** izostavi `AI_PROVIDER`/`OPENAI_API_KEY` i tekst
nikad ne napušta računar. Sporo, ali radi; za velike knjige podesi `-e OLLAMA_TIMEOUT_MS=1800000`.

Skripta skenira folder, registruje nove fajlove (dedup po hash-u — već obrađene preskače),
obradi ih redom (segment po segment, sa progresom u konzoli) i upiše kartice u Neon. Čim se
završi, kartice su vidljive na sajtu. Opcije: `... processBooks.js scan` (samo lista),
`... processBooks.js <bookId>` (jedna knjiga, i ponovo ako je već obrađena).

Alternativa: upload kroz admin na sajtu — radi (obrada ide kroz Groq), fajl je efemeran ali
IZVUČENE KARTICE ostaju trajno u bazi.

## Lokalno vs. produkcija

| | Lokalno (docker compose up) | Produkcija |
|---|---|---|
| Baza | Postgres kontejner (port 5433) | Neon |
| AI | Ollama na hostu (`llama3.1:8b`) | Groq (`llama-3.1-8b-instant`) |
| Knjige | `Baza znanja/` folder + upload | samo upload (efemeran fajl, kartice trajne) |

Env promenljive su jedina razlika — kod je identičan (`AI_PROVIDER=ollama` / `openai`).
