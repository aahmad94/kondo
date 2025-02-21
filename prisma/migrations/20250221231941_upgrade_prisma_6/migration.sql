/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DailySummary` table. All the data in the column will be lost.
  - You are about to drop the column `responseIds` on the `DailySummary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailySummary" DROP COLUMN "createdAt",
DROP COLUMN "responseIds";

-- AlterTable
ALTER TABLE "GPTResponse" ALTER COLUMN "rank" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "subscribed" DROP NOT NULL;

-- AlterTable
ALTER TABLE "_BookmarksToResponses" ADD CONSTRAINT "_BookmarksToResponses_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BookmarksToResponses_AB_unique";

-- CreateTable
CREATE TABLE "_DailySummaryToResponses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DailySummaryToResponses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DailySummaryToResponses_B_index" ON "_DailySummaryToResponses"("B");

-- AddForeignKey
ALTER TABLE "_DailySummaryToResponses" ADD CONSTRAINT "_DailySummaryToResponses_A_fkey" FOREIGN KEY ("A") REFERENCES "DailySummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailySummaryToResponses" ADD CONSTRAINT "_DailySummaryToResponses_B_fkey" FOREIGN KEY ("B") REFERENCES "GPTResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
