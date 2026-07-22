import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, intParam } from '../lib/errors.js';
import { startProcessing } from '../services/bookPipeline.js';
import { scanKnowledgeDir } from '../services/scan.js';
import { isQueued } from '../services/jobs.js';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const safe = Buffer.from(file.originalname, 'latin1')
        .toString('utf8')
        .replace(/[^\w.\-()\s]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') cb(null, true);
    else cb(new HttpError(400, 'Podržani su samo .pdf i .docx fajlovi'));
  },
});

function bookView(b) {
  let fileMissing = false;
  try {
    fs.accessSync(b.filePath);
  } catch {
    fileMissing = true; // fajl nije na ovom serveru (npr. registrovan lokalno)
  }
  return {
    ...b,
    progress: b.totalSegments > 0 ? Math.round((b.doneSegments / b.totalSegments) * 100) : 0,
    queued: isQueued(b.id),
    fileMissing,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const books = await prisma.book.findMany({ orderBy: { id: 'desc' } });
    res.json(books.map(bookView));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new HttpError(404, 'Knjiga ne postoji');
    res.json(bookView(book));
  })
);

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Fajl nije poslat (polje "file")');
    const buffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const existing = await prisma.book.findUnique({ where: { fileHash } });
    if (existing) {
      fs.unlinkSync(req.file.path);
      throw new HttpError(409, `Ova knjiga je već dodata: "${existing.title}" (status: ${existing.status})`);
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const book = await prisma.book.create({
      data: {
        title: req.body.title || path.basename(originalName, ext),
        author: req.body.author || null,
        language: req.body.language || null,
        filePath: req.file.path,
        fileType: ext.slice(1),
        fileHash,
      },
    });
    startProcessing(book.id);
    res.status(201).json(bookView(book));
  })
);

// Skeniraj folder baze znanja (registruje nove fajlove i pokreće obradu)
router.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const result = await scanKnowledgeDir(req.body?.process !== false);
    res.json({
      scanned: result.scanned,
      addedCount: result.added?.length || 0,
      added: (result.added || []).map(bookView),
      existing: result.existing,
      error: result.error,
    });
  })
);

// (Ponovo) pokreni obradu knjige
router.post(
  '/:id/process',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new HttpError(404, 'Knjiga ne postoji');
    if (book.status === 'processing' || isQueued(id)) {
      throw new HttpError(409, 'Knjiga se već obrađuje');
    }
    if (!fs.existsSync(book.filePath)) {
      throw new HttpError(
        409,
        'Fajl ove knjige nije na serveru (registrovana je lokalno). Obradi je lokalno u Neon bazu ili dodaj knjigu preko „Upload".'
      );
    }
    startProcessing(id);
    res.json({ ok: true, message: 'Obrada pokrenuta' });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const data = {};
    for (const f of ['title', 'author', 'language']) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    try {
      const book = await prisma.book.update({ where: { id }, data });
      res.json(bookView(book));
    } catch (err) {
      if (err.code === 'P2025') throw new HttpError(404, 'Knjiga ne postoji');
      throw err;
    }
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'id');
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new HttpError(404, 'Knjiga ne postoji');
    // obriši i kartice te knjige (SetNull bi ih ostavio kao siročiće)
    await prisma.$transaction([
      prisma.card.deleteMany({ where: { bookId: id } }),
      prisma.book.delete({ where: { id } }),
    ]);
    // obriši fajl samo ako je u upload folderu (ne diramo Bazu znanja)
    if (book.filePath.startsWith(UPLOAD_DIR)) {
      fs.promises.unlink(book.filePath).catch(() => {});
    }
    res.json({ ok: true });
  })
);

export default router;
