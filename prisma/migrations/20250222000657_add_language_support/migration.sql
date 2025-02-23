/*
  Warnings:

  - Added the required column `languageId` to the `Bookmark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `languageId` to the `DailySummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `languageId` to the `GPTResponse` table without a default value. This is not possible if the table is not empty.

*/
-- Create Language table first
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- Create unique index on language code
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- Insert default Japanese language
INSERT INTO "Language" ("id", "code", "name") 
VALUES ('default_japanese', 'ja', 'Japanese');

-- Create UserLanguagePreference table
CREATE TABLE "UserLanguagePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLanguagePreference_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId for UserLanguagePreference
CREATE UNIQUE INDEX "UserLanguagePreference_userId_key" ON "UserLanguagePreference"("userId");

-- Add languageId column to GPTResponse with default Japanese
ALTER TABLE "GPTResponse" 
ADD COLUMN "languageId" TEXT NOT NULL DEFAULT 'default_japanese';

-- Add languageId column to Bookmark with default Japanese
ALTER TABLE "Bookmark" 
ADD COLUMN "languageId" TEXT NOT NULL DEFAULT 'default_japanese',
ADD COLUMN "isReserved" BOOLEAN NOT NULL DEFAULT false;

-- Add languageId column to DailySummary with default Japanese
ALTER TABLE "DailySummary" 
ADD COLUMN "languageId" TEXT NOT NULL DEFAULT 'default_japanese',
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints
ALTER TABLE "UserLanguagePreference" ADD CONSTRAINT "UserLanguagePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLanguagePreference" ADD CONSTRAINT "UserLanguagePreference_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GPTResponse" ADD CONSTRAINT "GPTResponse_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing reserved bookmarks
UPDATE "Bookmark" SET "isReserved" = true WHERE "title" IN ('all responses', 'daily summary');
