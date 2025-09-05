-- AlterTable
-- Add CASCADE delete to CommunityImport.importedResponse foreign key

-- Drop the existing foreign key constraint
ALTER TABLE "CommunityImport" DROP CONSTRAINT "CommunityImport_importedResponseId_fkey";

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE "CommunityImport" ADD CONSTRAINT "CommunityImport_importedResponseId_fkey" FOREIGN KEY ("importedResponseId") REFERENCES "GPTResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
