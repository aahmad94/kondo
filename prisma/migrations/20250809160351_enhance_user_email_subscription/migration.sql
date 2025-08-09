-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailFrequency" TEXT NOT NULL DEFAULT 'daily',
ADD COLUMN     "emailSubscribedAt" TIMESTAMP(3),
ADD COLUMN     "lastEmailSent" TIMESTAMP(3),
ADD COLUMN     "subscriptionEmail" TEXT,
ADD COLUMN     "theme" TEXT DEFAULT 'light',
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);
