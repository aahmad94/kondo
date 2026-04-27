import 'server-only';
import prisma from '@/lib/database/prisma';
import stripe from './stripeClient';
import { FREE_LIMITS, type QuotaType, type QuotaResult } from './quotaLimits';

// Re-export client-safe constants/types so existing server imports keep working.
export { FREE_LIMITS };
export type { QuotaType, QuotaResult };

// ─── Date helpers (UTC) ───────────────────────────────────────────────────────

/** Returns midnight UTC of the most recent Monday */
function getStartOfWeekUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? 6 : day - 1; // days since last Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday;
}

/** Returns midnight UTC of today */
function getStartOfDayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ─── Subscription status ──────────────────────────────────────────────────────

export async function isPremiumUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  return user?.subscriptionStatus === 'premium';
}

// ─── Usage tracking ───────────────────────────────────────────────────────────

/**
 * Gets (or creates) the UsageTracking row for a user, resetting stale periods.
 */
async function getOrCreateUsageTracking(userId: string) {
  let tracking = await prisma.usageTracking.findUnique({ where: { userId } });

  if (!tracking) {
    tracking = await prisma.usageTracking.create({
      data: {
        userId,
        weekStartDate: getStartOfWeekUTC(),
        dailyResetDate: getStartOfDayUTC(),
      },
    });
    return tracking;
  }

  const weekStart = getStartOfWeekUTC();
  const dayStart = getStartOfDayUTC();

  const needsWeekReset = tracking.weekStartDate < weekStart;
  const needsDayReset = tracking.dailyResetDate < dayStart;

  if (needsWeekReset || needsDayReset) {
    tracking = await prisma.usageTracking.update({
      where: { userId },
      data: {
        ...(needsWeekReset && {
          responsesThisWeek: 0,
          voiceChatsThisWeek: 0,
          weekStartDate: weekStart,
        }),
        ...(needsDayReset && {
          breakdownsToday: 0,
          ttsToday: 0,
          dailyResetDate: dayStart,
        }),
      },
    });
  }

  return tracking;
}

// ─── Quota checks (read-only) ─────────────────────────────────────────────────

export async function checkResponseQuota(userId: string): Promise<QuotaResult> {
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, isPremium: true, current: 0, limit: Infinity, remaining: Infinity };
  }

  const tracking = await getOrCreateUsageTracking(userId);
  const current = tracking.responsesThisWeek;
  const limit = FREE_LIMITS.RESPONSES_PER_WEEK;

  return {
    allowed: current < limit,
    isPremium: false,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

export async function checkBreakdownQuota(userId: string): Promise<QuotaResult> {
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, isPremium: true, current: 0, limit: Infinity, remaining: Infinity };
  }

  const tracking = await getOrCreateUsageTracking(userId);
  const current = tracking.breakdownsToday;
  const limit = FREE_LIMITS.BREAKDOWNS_PER_DAY;

  return {
    allowed: current < limit,
    isPremium: false,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

export async function checkTTSQuota(userId: string): Promise<QuotaResult> {
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, isPremium: true, current: 0, limit: Infinity, remaining: Infinity };
  }

  const tracking = await getOrCreateUsageTracking(userId);
  const current = tracking.ttsToday;
  const limit = FREE_LIMITS.TTS_PER_DAY;

  return {
    allowed: current < limit,
    isPremium: false,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

export async function checkVoiceChatQuota(userId: string): Promise<QuotaResult> {
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, isPremium: true, current: 0, limit: Infinity, remaining: Infinity };
  }

  const tracking = await getOrCreateUsageTracking(userId);
  const current = tracking.voiceChatsThisWeek;
  const limit = FREE_LIMITS.VOICE_CHATS_PER_WEEK;

  return {
    allowed: current < limit,
    isPremium: false,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

// ─── Quota increments ─────────────────────────────────────────────────────────

export async function incrementResponseUsage(userId: string): Promise<void> {
  await getOrCreateUsageTracking(userId); // ensures reset happens first
  await prisma.usageTracking.update({
    where: { userId },
    data: { responsesThisWeek: { increment: 1 } },
  });
}

export async function incrementBreakdownUsage(userId: string): Promise<void> {
  await getOrCreateUsageTracking(userId);
  await prisma.usageTracking.update({
    where: { userId },
    data: { breakdownsToday: { increment: 1 } },
  });
}

export async function incrementTTSUsage(userId: string): Promise<void> {
  await getOrCreateUsageTracking(userId);
  await prisma.usageTracking.update({
    where: { userId },
    data: { ttsToday: { increment: 1 } },
  });
}

export async function incrementVoiceChatUsage(userId: string): Promise<void> {
  await getOrCreateUsageTracking(userId);
  await prisma.usageTracking.update({
    where: { userId },
    data: { voiceChatsThisWeek: { increment: 1 } },
  });
}

// ─── Stripe customer management ───────────────────────────────────────────────

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  // Verify the stored customer still exists in the current Stripe mode/account.
  // If it was created in test mode (or deleted), Stripe returns { deleted: true }
  // or throws `resource_missing`; in either case we create a fresh one.
  if (user?.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!(existing as any).deleted) {
        return user.stripeCustomerId;
      }
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err;
    }
    console.warn(
      `[stripe] stored customer ${user.stripeCustomerId} not found for user ${userId}; creating a new one`,
    );
  }

  const customer = await stripe.customers.create({ email, metadata: { userId } });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// ─── Subscription sync from webhooks ─────────────────────────────────────────

export async function syncSubscriptionFromStripe(
  customerId: string,
  status: 'premium' | 'free' | 'past_due' | 'canceled',
  subscriptionId?: string,
  priceId?: string,
  endsAt?: Date,
): Promise<void> {
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: status,
      ...(subscriptionId !== undefined && { subscriptionId }),
      ...(priceId !== undefined && { stripePriceId: priceId }),
      ...(endsAt !== undefined && { subscriptionEndsAt: endsAt }),
    },
  });
}

// ─── Quota errors ─────────────────────────────────────────────────────────────

/**
 * Thrown by service-layer code when a user has exhausted a quota. API routes
 * can catch this and translate it into a 429 via `quotaExceededResponse`.
 */
export class QuotaExceededError extends Error {
  readonly quotaType: QuotaType;
  readonly quota: QuotaResult;

  constructor(quotaType: QuotaType, quota: QuotaResult) {
    super(`Quota exceeded: ${quotaType}`);
    this.name = 'QuotaExceededError';
    this.quotaType = quotaType;
    this.quota = quota;
  }
}

export function isQuotaExceededError(err: unknown): err is QuotaExceededError {
  return err instanceof QuotaExceededError;
}

// ─── Per-response/day quota gate (breakdown + TTS) ────────────────────────────

/**
 * Detects null/undefined/empty/temp responseIds. Temp responses are transient
 * client-side artifacts that don't have a stable id, so we can't dedup against
 * them — every server hit for a temp response counts. (Repeat clicks are
 * suppressed by the client-side caches.)
 */
function isPersistedResponseId(responseId: string | null | undefined): responseId is string {
  return (
    !!responseId &&
    responseId !== 'null' &&
    responseId !== 'undefined' &&
    !responseId.includes('temp')
  );
}

/**
 * Decides whether the given (user, feature, responseId) should count toward
 * today's quota. Persisted responses are deduped via the `QuotaConsumption`
 * table — at most one count per (userId, feature, responseId, UTC day).
 */
async function shouldCountConsumption(
  userId: string,
  feature: 'breakdown' | 'tts',
  responseId: string | null | undefined,
): Promise<boolean> {
  if (!isPersistedResponseId(responseId)) return true;

  const existing = await prisma.quotaConsumption.findUnique({
    where: {
      userId_feature_responseId_dayBucket: {
        userId,
        feature,
        responseId,
        dayBucket: getStartOfDayUTC(),
      },
    },
    select: { id: true },
  });
  return existing == null;
}

async function recordConsumption(
  userId: string,
  feature: 'breakdown' | 'tts',
  responseId: string | null | undefined,
): Promise<void> {
  if (!isPersistedResponseId(responseId)) return;
  try {
    await prisma.quotaConsumption.create({
      data: {
        userId,
        feature,
        responseId,
        dayBucket: getStartOfDayUTC(),
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation; another concurrent request already
    // recorded today's consumption for this (user, feature, responseId).
    // Treat it as already-counted and move on.
    if (err?.code !== 'P2002') throw err;
  }
}

/**
 * Up-front gate for breakdown/TTS service calls.
 *
 * If the (user, feature, responseId) tuple has already been counted for the
 * current UTC day, returns a no-op completion handler — the caller proceeds
 * with the (likely cached) work and we don't touch the counter.
 *
 * Otherwise, runs the appropriate quota check (throws `QuotaExceededError`
 * if the user is maxed out for today) and returns a `commit` callback that
 * the caller invokes after the operation succeeds; commit records the
 * consumption row and increments the daily counter.
 */
export async function gateDailyResponseFeature(
  feature: 'breakdown' | 'tts',
  userId: string | null | undefined,
  responseId: string | null | undefined,
): Promise<{ commit: () => Promise<void> }> {
  // Anonymous / unauthenticated callers are never gated.
  if (!userId) return { commit: async () => {} };

  const willCount = await shouldCountConsumption(userId, feature, responseId);
  if (!willCount) return { commit: async () => {} };

  const quota = feature === 'breakdown'
    ? await checkBreakdownQuota(userId)
    : await checkTTSQuota(userId);

  if (!quota.allowed) {
    throw new QuotaExceededError(feature === 'breakdown' ? 'breakdowns' : 'tts', quota);
  }

  return {
    commit: async () => {
      await recordConsumption(userId, feature, responseId);
      if (feature === 'breakdown') {
        await incrementBreakdownUsage(userId);
      } else {
        await incrementTTSUsage(userId);
      }
    },
  };
}

// ─── Quota error payload (for API responses) ──────────────────────────────────

export function quotaExceededResponse(type: QuotaType, quota: QuotaResult) {
  const messages: Record<QuotaType, string> = {
    responses: `You've used all ${FREE_LIMITS.RESPONSES_PER_WEEK} of your free responses this week. Upgrade to Premium for unlimited access.`,
    breakdowns: `You've used all ${FREE_LIMITS.BREAKDOWNS_PER_DAY} free breakdowns today. Upgrade to Premium for unlimited access.`,
    tts: `You've used all ${FREE_LIMITS.TTS_PER_DAY} free audio generations today. Upgrade to Premium for unlimited access.`,
    voice: `You've used all ${FREE_LIMITS.VOICE_CHATS_PER_WEEK} free voice chats this week. Upgrade to Premium for unlimited access.`,
  };

  return {
    error: 'QUOTA_EXCEEDED',
    quotaType: type,
    message: messages[type],
    current: quota.current,
    limit: quota.limit,
  };
}
