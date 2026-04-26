-- AddVoiceChatWeeklyQuota
-- Adds a weekly voice chat quota counter to UsageTracking. Breakdown and TTS
-- quotas remain on their existing daily cadence.
--
-- NOTE: This migration is kept for historical record. The DB is being kept in
-- sync via `prisma db push`, so this file is NOT intended to be applied via
-- `prisma migrate deploy`. Reapply manually if the DB is ever rebuilt from
-- migrations.

ALTER TABLE "UsageTracking" ADD COLUMN "voiceChatsThisWeek" INTEGER NOT NULL DEFAULT 0;
