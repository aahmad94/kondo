-- AlterTable
ALTER TABLE "GPTResponse" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscribed" BOOLEAN NOT NULL DEFAULT false;
