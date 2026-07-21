-- CreateTable
CREATE TABLE "CardSignal" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardSignal_categoryId_idx" ON "CardSignal"("categoryId");

-- CreateIndex
CREATE INDEX "CardSignal_createdAt_idx" ON "CardSignal"("createdAt");
