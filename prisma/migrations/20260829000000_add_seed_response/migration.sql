-- CreateTable
CREATE TABLE "SeedResponse" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "deckTitle" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "responseType" TEXT NOT NULL DEFAULT 'response',
    "rank" INTEGER NOT NULL DEFAULT 1,
    "furigana" TEXT,
    "breakdown" TEXT,
    "mobileBreakdown" TEXT,
    "audio" TEXT,
    "audioMimeType" TEXT,
    "sourceResponseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeedResponse_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Bookmark" ADD COLUMN "seedProvisionedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GPTResponse" ADD COLUMN "seedResponseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SeedResponse_sourceResponseId_key" ON "SeedResponse"("sourceResponseId");

-- CreateIndex
CREATE INDEX "SeedResponse_languageId_deckTitle_idx" ON "SeedResponse"("languageId", "deckTitle");

-- CreateIndex
CREATE UNIQUE INDEX "SeedResponse_languageId_deckTitle_sortOrder_key" ON "SeedResponse"("languageId", "deckTitle", "sortOrder");

-- CreateIndex
CREATE INDEX "GPTResponse_seedResponseId_idx" ON "GPTResponse"("seedResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "GPTResponse_userId_seedResponseId_key" ON "GPTResponse"("userId", "seedResponseId");

-- AddForeignKey
ALTER TABLE "SeedResponse" ADD CONSTRAINT "SeedResponse_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPTResponse" ADD CONSTRAINT "GPTResponse_seedResponseId_fkey" FOREIGN KEY ("seedResponseId") REFERENCES "SeedResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
