-- Vesti / objave (uređuje moderator+ preko admin panela).
CREATE TABLE IF NOT EXISTS "Post" (
  "id"        SERIAL PRIMARY KEY,
  "slug"      TEXT NOT NULL UNIQUE,
  "title"     TEXT NOT NULL,
  "category"  TEXT NOT NULL DEFAULT 'vesti',
  "excerpt"   TEXT NOT NULL DEFAULT '',
  "body"      TEXT NOT NULL DEFAULT '',
  "cover"     TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Post_published_createdAt_idx" ON "Post" ("published", "createdAt");
