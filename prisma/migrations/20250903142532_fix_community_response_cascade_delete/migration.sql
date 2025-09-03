-- DropForeignKey: Remove existing foreign key constraint
ALTER TABLE "CommunityResponse" DROP CONSTRAINT "CommunityResponse_originalResponseId_fkey";

-- AddForeignKey: Add foreign key with CASCADE delete
ALTER TABLE "CommunityResponse" ADD CONSTRAINT "CommunityResponse_originalResponseId_fkey" FOREIGN KEY ("originalResponseId") REFERENCES "GPTResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
