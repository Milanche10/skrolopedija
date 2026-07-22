-- Nalozi + per-user stanje. Sadržaj (Card/Category/Book) ostaje netaknut;
-- postojeće per-user stanje (saved/seen/quiz/signal/review/userstate) se resetuje.

-- CreateTable User
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Rebuild per-user state tables
DROP TABLE IF EXISTS "SavedCard";
DROP TABLE IF EXISTS "SeenCard";
DROP TABLE IF EXISTS "QuizAnswer";
DROP TABLE IF EXISTS "ReviewState";
DROP TABLE IF EXISTS "CardSignal";
DROP TABLE IF EXISTS "UserState";

CREATE TABLE "UserState" (
    "userId" INTEGER NOT NULL,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" TIMESTAMP(3),
    "filters" JSONB,
    CONSTRAINT "UserState_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "SavedCard" (
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("userId","cardId")
);

CREATE TABLE "SeenCard" (
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeenCard_pkey" PRIMARY KEY ("userId","cardId")
);

CREATE TABLE "QuizAnswer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuizAnswer_userId_idx" ON "QuizAnswer"("userId");

CREATE TABLE "ReviewState" (
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("userId","cardId")
);
CREATE INDEX "ReviewState_dueAt_idx" ON "ReviewState"("dueAt");

CREATE TABLE "CardSignal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardSignal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CardSignal_userId_categoryId_idx" ON "CardSignal"("userId","categoryId");
CREATE INDEX "CardSignal_createdAt_idx" ON "CardSignal"("createdAt");

-- Foreign keys
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCard" ADD CONSTRAINT "SavedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedCard" ADD CONSTRAINT "SavedCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeenCard" ADD CONSTRAINT "SeenCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeenCard" ADD CONSTRAINT "SeenCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardSignal" ADD CONSTRAINT "CardSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
