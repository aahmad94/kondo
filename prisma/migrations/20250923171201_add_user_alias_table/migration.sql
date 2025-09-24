-- CreateTable
CREATE TABLE "UserAlias" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "isCurrentlyActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAlias_pkey" PRIMARY KEY ("id")
);

-- Add currentAliasId column to User table
ALTER TABLE "User" ADD COLUMN "currentAliasId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserAlias_alias_key" ON "UserAlias"("alias");

-- CreateIndex
CREATE INDEX "UserAlias_userId_idx" ON "UserAlias"("userId");

-- CreateIndex
CREATE INDEX "UserAlias_alias_idx" ON "UserAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "User_currentAliasId_key" ON "User"("currentAliasId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentAliasId_fkey" FOREIGN KEY ("currentAliasId") REFERENCES "UserAlias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlias" ADD CONSTRAINT "UserAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
