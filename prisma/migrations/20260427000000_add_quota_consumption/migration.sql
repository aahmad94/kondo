-- AddQuotaConsumption
-- Tracks a (user, feature, responseId, dayBucket) tuple per breakdown/TTS
-- click so we count at most once per UTC day per response, while still
-- counting again on later days.
--
-- NOTE: This migration is kept for historical record. The DB is being kept
-- in sync via `prisma db push`, so this file is NOT intended to be applied
-- via `prisma migrate deploy`. Reapply manually if the DB is ever rebuilt
-- from migrations.

CREATE TABLE "QuotaConsumption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "dayBucket" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaConsumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuotaConsumption_userId_feature_responseId_dayBucket_key"
    ON "QuotaConsumption"("userId", "feature", "responseId", "dayBucket");

CREATE INDEX "QuotaConsumption_userId_dayBucket_idx"
    ON "QuotaConsumption"("userId", "dayBucket");

ALTER TABLE "QuotaConsumption" ADD CONSTRAINT "QuotaConsumption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
