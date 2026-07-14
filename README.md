# Skrolopedija

Aplikacija za mikroučenje kroz skrolovanje (u stilu Instagram Reels-a). Vertikalno skroluješ
kartice-lekcije preko celog ekrana, iz raznih oblasti znanja i iz knjiga koje ubaciš kao PDF/DOCX.
Sadržaj se pravi iz tri izvora: početni seed iz prototipa, AI generisanje po kategoriji, obrada
knjiga i prikupljanje sa Wikipedije.

## Arhitektura

Tri Docker servisa, jedna komanda za pokretanje:

- **db** — PostgreSQL 16 (podaci u `pgdata` volume-u)
- **api** — Node.js + Express + Prisma (port 4000)
- **web** — React + Vite, mobile-first (port 5173)

Sav sadržaj je u bazi — u frontendu ništa nije hardkodirano (ni kategorije, ni kartice, ni knjige).

## Pokretanje

Potreban je **Docker Desktop**. Za AI se podrazumevano koristi **Ollama** (lokalno, besplatno).

```bash
# 1. (opciono) podesi konfiguraciju
cp .env.example .env

# 2. Instaliraj Ollama i preuzmi model (jednom, na hostu)
#    https://ollama.com  →  zatim:
ollama pull llama3.1:8b

# 3. Podigni sve
docker compose up
```

- Feed:  http://localhost:5173
- Admin: http://localhost:5173/admin
- API:   http://localhost:4000/health  (pokazuje AI provajdera i da li je spreman)

Pri prvom pokretanju API automatski primeni migracije i pokrene seed
(kategorije + kartice iz prototipa + 10 novih kategorija sa početnim karticama).

> Aplikacija radi i **bez** AI-ja — feed, seed i CRUD funkcionišu. Samo AI funkcije
> (generisanje, obrada knjiga, web-prikupljanje) traže dostupan model.

## AI provajder (Ollama ili Anthropic)

Bira se u `.env` promenljivom `AI_PROVIDER`:

**Ollama (podrazumevano, besplatno, bez ključa):**

```
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434   # host se iz kontejnera dostiže ovako
OLLAMA_MODEL=llama3.1:8b
```

Ollama radi na hostu (`ollama serve`), a API mu pristupa preko `host.docker.internal`
(u compose-u je dodat `extra_hosts: host-gateway`). Model se preuzima jednom: `ollama pull llama3.1:8b`.
Drugi modeli rade isto — samo promeni `OLLAMA_MODEL` (npr. `qwen2.5:7b`, `gemma2:2b`).

**Anthropic (ako imaš ključ):**

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
GEN_MODEL=claude-sonnet-4-6     # za generisanje
BULK_MODEL=claude-haiku-4-5     # jeftinije za masovne poslove
```

`.env` je u `.gitignore` i **nikad se ne komituje**. Šablon je `.env.example`.
Ceo ostatak aplikacije (upload, chunking, dedup, feed) je isti bez obzira na provajdera.

## Seed iz prototipa

Skripta `api/scripts/seed.js` parsira `skrolopedija.html` (nizovi `CARDS` i `CATS` iz `<script>`
bloka) i ubacuje kategorije i svih ~197 kartica u bazu. Parser je otporan na komentare i zagrade
unutar stringova (`api/scripts/parsePrototype.js`).

- Stavi `skrolopedija.html` u koren projekta (pored `docker-compose.yml`).
- Seed je idempotentan — ponovno pokretanje ne pravi duplikate.
- Ako fajl nije prisutan, seed to prijavi i svejedno ubaci 10 novih kategorija sa
  ručno napisanim početnim karticama (`api/seed-data/new-categories.json`).

Ručno ponovno pokretanje seed-a:

```bash
docker compose exec api npm run seed
```

## Dodavanje knjige

Podržani formati: **PDF (.pdf)** i **Word (.docx)**. Dva načina:

1. **Folder `Baza znanja/`** (u korenu projekta, montiran u kontejner):
   - Ubaci fajl u folder.
   - U adminu → tab *Knjige* → **„Skeniraj bazu znanja"** (ili `POST /books/scan`).
   - Novi fajlovi se registruju i obrade; već obrađeni se prepoznaju po hash-u i preskaču.
2. **Upload kroz UI**: admin → *Knjige* → **Upload knjige**.

Obrada teče kao pozadinski posao: tekst se ekstrahuje, deli na segmente (~3000–5000 tokena sa
preklapanjem), i za svaki segment AI izvlači sve vredne lekcije kao kartice (srpski, latinica,
parafrazirano). Napredak (segment/ukupno) vidi se u tabeli. Cilj je 100–250 kartica iz veće knjige.
Skenirani PDF bez tekstualnog sloja se prijavi kao „potreban OCR".

Etika pipeline-a: kartice su parafraze (nikad copy-paste); iz knjiga o socijalnim veštinama
izvlače se konstruktivne lekcije, a preskače sadržaj koji je čista obmana/manipulacija.

## Dodavanje kategorije

- **Admin UI**: tab *Kategorije* → forma „Nova kategorija" (key, naziv, boja, emoji).
- **API**: `POST /categories`.

Struktura je proširiva — nove oblasti se dodaju bez diranja koda. Na svakoj kategoriji u adminu
postoje dugmad **✨ AI +5** (generiši 5 kartica) i **🌐 Web** (prikupi sa Wikipedije).

## AI izvori sadržaja

1. **Knjige** — upload/skeniranje foldera → obrada (najdetaljniji izvor).
2. **Po kategoriji** — `POST /categories/:id/generate` (`{count}`, default 5), izbegava postojeće naslove.
3. **Web** — `POST /collect/:categoryId` povlači Wikipedia (sr/en, „Na današnji dan" za Istoriju),
   pa AI parafrazira u kartice. Opcioni dnevni cron: `DAILY_COLLECT_CRON` u `.env`.

## API pregled

| Metoda | Ruta | Opis |
|---|---|---|
| GET | `/feed` | Feed sa paginacijom: `?categories=1,2&filter=all\|saved\|books\|quizzes&seed=&cursor=&limit=` |
| GET/POST/PUT/DELETE | `/categories`, `/categories/:id` | CRUD kategorija |
| POST | `/categories/:id/generate` | AI generisanje kartica |
| GET/POST/PUT/DELETE | `/cards`, `/cards/:id` | CRUD kartica (paginacija, filteri) |
| POST/DELETE | `/cards/:id/save` | Sačuvaj / ukloni |
| POST | `/cards/:id/seen` | Označi viđeno |
| POST | `/cards/:id/quiz-answer` | Odgovor na kviz (`{correct}`) |
| GET/POST/PUT/DELETE | `/books`, `/books/:id` | Knjige |
| POST | `/books/upload` | Upload (multipart) |
| POST | `/books/scan` | Skeniraj `Baza znanja/` |
| POST | `/books/:id/process` | (Ponovo) pokreni obradu |
| POST | `/collect/:categoryId` | Web-prikupljanje |
| GET | `/user/state` | Sačuvane/viđene/kviz/streak |
| POST | `/user/visit` | Registruj posetu (streak) |
| PUT | `/user/filters` | Zapamti izbor filtera |

## Testovi

```bash
docker compose exec api npm test        # svi testovi (uklj. API — traži bazu)
```

Lokalno bez baze rade jedinični testovi parsera/chunkera:

```bash
cd api && npx vitest run tests/parsePrototype.test.js tests/chunker.test.js
```

Pokriveni su: parser prototipa (kategorije/kartice/kviz/book polje), chunker (segmentacija +
praćenje strana), deduplikacija naslova, i API (CRUD, validacija, feed, streak) preko supertest-a.

## Struktura

```
docker-compose.yml         # db + api + web
Baza znanja/               # ovde ubacuješ PDF/DOCX knjige
api/   Express + Prisma + AI pipeline (routes, services, scripts, tests)
web/   React + Vite (feed, komponente, /admin)
```
