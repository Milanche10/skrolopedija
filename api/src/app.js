import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import categoriesRouter from './routes/categories.js';
import cardsRouter from './routes/cards.js';
import booksRouter from './routes/books.js';
import feedRouter from './routes/feed.js';
import userRouter from './routes/user.js';
import adminRouter from './routes/admin.js';
import newsRouter from './routes/news.js';
import { errorMiddleware, asyncHandler, intParam } from './lib/errors.js';
import { collectForCategory } from './services/webCollect.js';
import { hasAI, aiStatus } from './lib/llm.js';
import { authOptional, requireAdmin } from './lib/auth.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(authOptional); // puni req.user ako postoji token (gost = null)

  app.get(
    '/health',
    asyncHandler(async (req, res) => {
      const ai = await aiStatus();
      res.json({ ok: true, aiReady: ai.ready, ai });
    })
  );

  app.use('/auth', authRouter);
  app.use('/categories', categoriesRouter);
  app.use('/cards', cardsRouter);
  app.use('/books', requireAdmin, booksRouter);
  app.use('/feed', feedRouter);
  app.use('/user', userRouter);
  app.use('/news', newsRouter); // javno čitanje; izmena iza requireModerator u ruteru
  app.use('/admin', requireAdmin, adminRouter);

  // web-prikupljanje za kategoriju (admin — troši AI)
  app.post(
    '/collect/:categoryId',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const categoryId = intParam(req.params.categoryId, 'categoryId');
      const maxCards = Math.min(Math.max(Number(req.body?.count) || 6, 1), 15);
      const cards = await collectForCategory(categoryId, maxCards);
      res.status(201).json({ created: cards.length, cards });
    })
  );

  app.use((req, res) => res.status(404).json({ error: 'Ruta ne postoji' }));
  app.use(errorMiddleware);
  return app;
}
