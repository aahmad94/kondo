-- AddStripeSubscription
-- Adds Stripe subscription fields to User and creates UsageTracking table

-- Add Stripe subscription fields to User
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "stripePriceId" TEXT;

-- Unique constraints
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_subscriptionId_key" ON "User"("subscriptionId");

-- Create UsageTracking table
CREATE TABLE "UsageTracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsesThisWeek" INTEGER NOT NULL DEFAULT 0,
    "weekStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "breakdownsToday" INTEGER NOT NULL DEFAULT 0,
    "ttsToday" INTEGER NOT NULL DEFAULT 0,
    "dailyResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageTracking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageTracking_userId_key" ON "UsageTracking"("userId");
CREATE INDEX "UsageTracking_userId_idx" ON "UsageTracking"("userId");

ALTER TABLE "UsageTracking" ADD CONSTRAINT "UsageTracking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
