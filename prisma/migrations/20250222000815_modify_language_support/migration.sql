-- AlterTable
ALTER TABLE "Bookmark" ALTER COLUMN "languageId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DailySummary" ALTER COLUMN "languageId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GPTResponse" ALTER COLUMN "languageId" DROP DEFAULT;
