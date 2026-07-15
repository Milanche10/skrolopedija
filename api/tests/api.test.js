import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// Ovi testovi zahtevaju Postgres (DATABASE_URL). Unutar docker-a je dostupan.
// Ako baza nije dostupna, cela grupa se preskače da lokalni `vitest` ne pukne.
let dbReady = false;
try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  dbReady = true;
} catch {
  dbReady = false;
}

const d = dbReady ? describe : describe.skip;
const app = createApp();

d('API', () => {
  const created = { catId: null, cardId: null };

  beforeAll(async () => {
    // čist prostor za test: obriši test kategoriju ako je zaostala
    await prisma.category.deleteMany({ where: { key: 'test-kategorija' } });
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { key: 'test-kategorija' } });
    await prisma.$disconnect();
  });

  it('health vraća ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('kreira kategoriju', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ key: 'test-kategorija', label: 'Test', color: '#123456', icon: '🧪' });
    expect(res.status).toBe(201);
    created.catId = res.body.id;
    expect(res.body.key).toBe('test-kategorija');
  });

  it('odbija nevažeću hex boju', async () => {
    const res = await request(app).post('/categories').send({ key: 'x-bad', label: 'X', color: 'crvena' });
    expect(res.status).toBe(400);
  });

  it('odbija duplikat key-a', async () => {
    const res = await request(app).post('/categories').send({ key: 'test-kategorija', label: 'Opet' });
    expect(res.status).toBe(409);
  });

  it('kreira karticu u kategoriji', async () => {
    const res = await request(app)
      .post('/cards')
      .send({ categoryId: created.catId, type: 'lesson', title: 'Test kartica', text: 'Tekst kartice.' });
    expect(res.status).toBe(201);
    created.cardId = res.body.id;
  });

  it('validira kviz karticu', async () => {
    const bad = await request(app)
      .post('/cards')
      .send({ categoryId: created.catId, type: 'quiz', title: 'Loš kviz', quiz: { q: 'a', opts: ['x'], ok: 5 } });
    expect(bad.status).toBe(400);
    const good = await request(app)
      .post('/cards')
      .send({
        categoryId: created.catId,
        type: 'quiz',
        title: 'Dobar kviz',
        quiz: { q: 'Pitanje?', opts: ['A', 'B'], ok: 1, expl: 'Zato.' },
      });
    expect(good.status).toBe(201);
  });

  it('save/unsave kartice radi', async () => {
    const save = await request(app).post(`/cards/${created.cardId}/save`);
    expect(save.body.saved).toBe(true);
    const unsave = await request(app).delete(`/cards/${created.cardId}/save`);
    expect(unsave.body.saved).toBe(false);
  });

  it('feed vraća stranice sa kompozitnim nextCursor', async () => {
    const res = await request(app).get(`/feed?categories=${created.catId}&limit=5`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(String(res.body.nextCursor)).toMatch(/^\d+-\d+$/);
  });

  it('feed ne duplira kartice kroz stranice kad nema kvizova', async () => {
    // 12 običnih kartica, bez ijednog kviza — pozicija 9 se popunjava običnom
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post('/cards')
        .send({ categoryId: created.catId, type: 'lesson', title: `Pag ${i}`, text: 'T.' });
    }
    const seed = 'pagetest';
    const p1 = await request(app).get(`/feed?categories=${created.catId}&limit=9&seed=${seed}`);
    const p2 = await request(app).get(
      `/feed?categories=${created.catId}&limit=9&seed=${seed}&cursor=${p1.body.nextCursor}`
    );
    const ids1 = p1.body.items.map((c) => c.id);
    const ids2 = p2.body.items.map((c) => c.id);
    expect(ids1.length).toBe(9);
    // nijedan id sa prve strane ne sme da se ponovi na drugoj
    expect(ids2.filter((id) => ids1.includes(id))).toEqual([]);
  });

  it('PUT ne dozvoljava type=quiz bez quiz polja, a quiz:null vraća 400 (ne 500)', async () => {
    const noQuiz = await request(app).put(`/cards/${created.cardId}`).send({ type: 'quiz' });
    expect(noQuiz.status).toBe(400);
    const quizCard = await request(app)
      .post('/cards')
      .send({
        categoryId: created.catId,
        type: 'quiz',
        title: 'Kviz za null test',
        quiz: { q: 'P?', opts: ['A', 'B'], ok: 0, expl: 'E.' },
      });
    const nullQuiz = await request(app).put(`/cards/${quizCard.body.id}`).send({ quiz: null });
    expect(nullQuiz.status).toBe(400);
    // ali skidanje kviza uz promenu tipa je dozvoljeno
    const demote = await request(app).put(`/cards/${quizCard.body.id}`).send({ type: 'lesson', quiz: null });
    expect(demote.status).toBe(200);
  });

  it('streak (visit) vraća count', async () => {
    const res = await request(app).post('/user/visit');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('briše kategoriju (kaskadno kartice)', async () => {
    const res = await request(app).delete(`/categories/${created.catId}`);
    expect(res.status).toBe(200);
    const check = await request(app).get(`/categories/${created.catId}`);
    expect(check.status).toBe(404);
  });

  it('nepoznata ruta vraća 404', async () => {
    const res = await request(app).get('/nepostoji');
    expect(res.status).toBe(404);
  });
});
