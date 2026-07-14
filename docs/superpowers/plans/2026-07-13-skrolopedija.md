# Skrolopedija Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-stack microlearning app (Instagram-Reels-style scrolling lesson cards) with Postgres DB, REST API, AI content pipeline (books, category generation, web collection) and mobile-first React frontend.

**Architecture:** Three Docker services — `db` (PostgreSQL 16), `api` (Node 20 + Express + Prisma), `web` (React + Vite dev server). All content lives in the DB. AI calls go through one Anthropic client module with retry/rate-limit. Book processing runs as in-process background jobs with polled status.

**Tech Stack:** Node 20, Express 4, Prisma 5, PostgreSQL 16, React 18, Vite 5, @anthropic-ai/sdk, pdf-parse, mammoth, multer, vitest + supertest.

## Global Constraints

- One command boot: `docker compose up` (db + api + web).
- `.env` holds `ANTHROPIC_API_KEY`; `.env.example` committed, real key never committed.
- Models: `claude-sonnet-4-6` for generation, `claude-haiku-4-5` allowed for bulk.
- Zero hardcoded content in frontend — categories, cards, books all from API.
- All card text in Serbian latinica, 3–5 sentences, paraphrased (never copied), quiz JSON `{q, opts[], ok, expl}`.
- Books folder: existing `Baza znanja/` in project root, mounted read-only into api container; hash-dedup on scan.
- Ethics: paraphrase only; skip manipulative/deceptive content from social-skills books; extract constructive lessons.
- Note: prototype `skrolopedija.html` is NOT present in the folder (verified 2026-07-13). Seed parser is built and tested against the documented structure (`CARDS` array + `CATS` object in a `<script>` block) and reports clearly when the file is absent. 10 new categories get authored seed cards regardless.

## File Structure

```
docker-compose.yml, .env.example, .gitignore, README.md
api/
  Dockerfile  package.json  vitest.config.js
  prisma/schema.prisma
  src/app.js  src/index.js
  src/lib/prisma.js  src/lib/anthropic.js  src/lib/errors.js
  src/routes/{categories,cards,books,feed,user}.js
  src/services/{extractText,chunker,cardGen,bookPipeline,webCollect,jobs,scan}.js
  scripts/seed.js  scripts/parsePrototype.js
  seed-data/new-categories.json
  tests/{api.test.js,chunker.test.js,parsePrototype.test.js,feed.test.js}
web/
  Dockerfile  package.json  vite.config.js  index.html
  src/main.jsx  src/App.jsx  src/api.js  src/styles.css
  src/components/{Feed,CardView,QuizCard,StoriesBar,FilterSheet,ActionRail,TopBar}.jsx
  src/admin/{Admin,CategoriesTable,CardsTable,BooksPanel}.jsx
```

### Task 1: Docker skeleton + schema  ✅ tracked as Task #1
- [ ] compose file (db healthcheck, api depends_on, volumes: pgdata, uploads, "./Baza znanja":/app/baza-znanja:ro), Dockerfiles with dev hot-reload (node --watch / vite)
- [ ] Prisma schema: Category, Book, Card, UserState, SavedCard, SeenCard, QuizAnswer (fields per spec; Card.quiz Json?, source enum-as-string, sourceRef)
- [ ] `prisma migrate dev` against dockerized db; verify `docker compose up` boots all three

### Task 2: Seed
- [ ] `parsePrototype.js`: extract `CARDS = [...]` and `CATS = {...}` from HTML `<script>` via balanced-bracket scan + `JSON5`-less eval-free parsing (Function constructor in sandboxed VM? No — use `vm.runInNewContext` with frozen globals); unit-tested with a fixture mimicking the prototype structure
- [ ] `seed.js`: upsert categories (existing + 10 new: Preživljavanje, Životinje, Dinosaurusi, Geografija, Ljudsko telo, Mitologija, Sajber bezbednost, Internet, Digitalna forenzika, Računarske mreže), insert prototype cards if file present, insert authored cards from `seed-data/new-categories.json` (10–15/category, quality bar per spec incl. technical categories)
- [ ] idempotent (skip when title+category exists)

### Task 3: API
- [ ] CRUD: /categories, /cards, /books (list/get/create/update/delete, validation, 400/404 semantics)
- [ ] GET /feed?categories=&filter=all|saved|books|quizzes&seed=&cursor=&limit= — unseen-first deterministic shuffle (md5(id||seed)), quiz interleave every 8–10, cursor pagination
- [ ] POST /cards/:id/save|unsave, /cards/:id/seen, /cards/:id/quiz-answer {correct}, GET/POST /streak, GET /user/state
- [ ] vitest+supertest green

### Task 4: Frontend feed
- [ ] scroll-snap fullscreen cards, dark theme, spine + per-category gradient, entry micro-animation, typography
- [ ] stories bar (gradient rings), bottom-sheet multi-select filter with presets (Sve/Sačuvano/Samo knjige/Samo kvizovi), persisted to localStorage + UserState
- [ ] action rail: heart (+double-tap heart burst), share (Web Share/clipboard), source popover; streak 🔥; position counter; pull-to-refresh reshuffle (new seed)
- [ ] quiz card interaction (answer → reveal, report to API); infinite scroll via cursor

### Task 5: AI generate per category
- [ ] `cardGen.js` prompts (Serbian latinica, existing-title dedup list, strict JSON), anthropic client with exponential backoff + 429 handling
- [ ] POST /categories/:id/generate {count=5} → inserts source:'ai'; button in admin + on category ring long-press/admin

### Task 6: Book pipeline
- [ ] upload (multer, pdf/docx, hash dedup) + POST /books/scan over /app/baza-znanja; startup scan
- [ ] extractText (pdf-parse w/ per-page markers; mammoth; OCR-needed detection), chunker (~3000–5000 tokens ≈ 12–20k chars, overlap ~500 chars, page tracking), per-segment extraction prompt (ALL lessons, 3–5 sentences, ethics guard), quiz gen every ~10 lessons, title-similarity dedup, sourceRef "str. N"
- [ ] jobs.js: in-process queue, per-book progress (segments done/total), status transitions; GET /books/:id shows progress; frontend progress bar
- [ ] verified end-to-end on a real file from Baza znanja (needs API key in .env)

### Task 7: Web collection
- [ ] webCollect.js: Wikipedia REST (sr/en summary + random by category topic map; On-this-day → Istorija), AI paraphrase to cards, sourceRef URL; POST /collect {categoryId}; optional daily cron (node-cron, env-gated)

### Task 8: Admin + README
- [ ] /admin: categories table (inline edit, color picker, add/delete), cards table (filter, edit, deactivate), books panel (upload, scan button, progress, per-book cards count), generate/collect buttons
- [ ] README: boot, env, adding books (both paths), adding categories, API overview, tests
- [ ] Full `docker compose up` smoke pass

## Self-Review
- Spec coverage: all spec sections map to tasks 1–8; prototype file absence documented with mitigation.
- Types consistent: Card.quiz JSON shape `{q,opts,ok,expl}` used in seed, API, feed, frontend, pipeline.
- No placeholders: concrete code written directly in the codebase per task (executor = author).
