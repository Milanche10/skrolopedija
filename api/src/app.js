import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import cardsRouter from './routes/cards.js';
import booksRouter from './routes/books.js';
import feedRouter from './routes/feed.js';
import userRouter from './routes/user.js';
import { errorMiddleware, asyncHandler, intParam } from './lib/errors.js';
import { collectForCategory } from './services/webCollect.js';
import { hasAI, aiStatus } from './lib/llm.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get(
    '/health',
    asyncHandler(async (req, res) => {
      const ai = await aiStatus();
      res.json({ ok: true, aiReady: ai.ready, ai });
    })
  );

  app.use('/categories', categoriesRouter);
  app.use('/cards', cardsRouter);
  app.use('/books', booksRouter);
  app.use('/feed', feedRouter);
  app.use('/user', userRouter);

  // web-prikupljanje za kategoriju
  app.post(
    '/collect/:categoryId',
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
