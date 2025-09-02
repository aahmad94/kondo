-- AddColumn: Add alias fields to User table
ALTER TABLE "User" ADD COLUMN "alias" TEXT;
ALTER TABLE "User" ADD COLUMN "isAliasPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "aliasCreatedAt" TIMESTAMP(3);

-- AddColumn: Add source and communityResponseId to GPTResponse table
ALTER TABLE "GPTResponse" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "GPTResponse" ADD COLUMN "communityResponseId" TEXT;

-- CreateTable: CommunityResponse
CREATE TABLE "CommunityResponse" (
    "id" TEXT NOT NULL,
    "originalResponseId" TEXT NOT NULL,
    "creatorAlias" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "bookmarkTitle" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "breakdown" TEXT,
    "mobileBreakdown" TEXT,
    "furigana" TEXT,
    "audio" TEXT,
    "audioMimeType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "importCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CommunityImport
CREATE TABLE "CommunityImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityResponseId" TEXT NOT NULL,
    "importedResponseId" TEXT NOT NULL,
    "importedBookmarkId" TEXT NOT NULL,
    "wasBookmarkCreated" BOOLEAN NOT NULL DEFAULT false,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: User alias unique constraint
CREATE UNIQUE INDEX "User_alias_key" ON "User"("alias");

-- CreateIndex: CommunityResponse indexes
CREATE UNIQUE INDEX "CommunityResponse_originalResponseId_key" ON "CommunityResponse"("originalResponseId");
CREATE INDEX "CommunityResponse_languageId_sharedAt_idx" ON "CommunityResponse"("languageId", "sharedAt");
CREATE INDEX "CommunityResponse_creatorUserId_idx" ON "CommunityResponse"("creatorUserId");
CREATE INDEX "CommunityResponse_bookmarkTitle_idx" ON "CommunityResponse"("bookmarkTitle");
CREATE INDEX "CommunityResponse_importCount_idx" ON "CommunityResponse"("importCount");

-- CreateIndex: CommunityImport indexes
CREATE UNIQUE INDEX "CommunityImport_importedResponseId_key" ON "CommunityImport"("importedResponseId");
CREATE UNIQUE INDEX "CommunityImport_userId_communityResponseId_key" ON "CommunityImport"("userId", "communityResponseId");

-- AddForeignKey: GPTResponse to CommunityResponse
ALTER TABLE "GPTResponse" ADD CONSTRAINT "GPTResponse_communityResponseId_fkey" FOREIGN KEY ("communityResponseId") REFERENCES "CommunityResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: CommunityResponse foreign keys
ALTER TABLE "CommunityResponse" ADD CONSTRAINT "CommunityResponse_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityResponse" ADD CONSTRAINT "CommunityResponse_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityResponse" ADD CONSTRAINT "CommunityResponse_originalResponseId_fkey" FOREIGN KEY ("originalResponseId") REFERENCES "GPTResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CommunityImport foreign keys
ALTER TABLE "CommunityImport" ADD CONSTRAINT "CommunityImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityImport" ADD CONSTRAINT "CommunityImport_communityResponseId_fkey" FOREIGN KEY ("communityResponseId") REFERENCES "CommunityResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityImport" ADD CONSTRAINT "CommunityImport_importedResponseId_fkey" FOREIGN KEY ("importedResponseId") REFERENCES "GPTResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommunityImport" ADD CONSTRAINT "CommunityImport_importedBookmarkId_fkey" FOREIGN KEY ("importedBookmarkId") REFERENCES "Bookmark"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
