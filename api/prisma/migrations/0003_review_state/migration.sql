-- CreateTable
CREATE TABLE "ReviewState" (
    "cardId" INTEGER NOT NULL,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("cardId")
);

-- CreateIndex
CREATE INDEX "ReviewState_dueAt_idx" ON "ReviewState"("dueAt");

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
