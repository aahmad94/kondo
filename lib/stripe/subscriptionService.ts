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

  // Determine what needs to be reset
  const weekStart = getStartOfWeekUTC();
  const dayStart = getStartOfDayUTC();

  const needsWeekReset = tracking.weekStartDate < weekStart;
  const needsDayReset = tracking.dailyResetDate < dayStart;

  if (needsWeekReset || needsDayReset) {
    tracking = await prisma.usageTracking.update({
      where: { userId },
      data: {
        ...(needsWeekReset && { responsesThisWeek: 0, weekStartDate: weekStart }),
        ...(needsDayReset && { breakdownsToday: 0, ttsToday: 0, dailyResetDate: dayStart }),
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

// ─── Stripe customer management ───────────────────────────────────────────────

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
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

// ─── Quota error payload (for API responses) ──────────────────────────────────

export function quotaExceededResponse(type: QuotaType, quota: QuotaResult) {
  const messages: Record<QuotaType, string> = {
    responses: `You've used all ${FREE_LIMITS.RESPONSES_PER_WEEK} of your free responses this week. Upgrade to Premium for unlimited access.`,
    breakdowns: `You've used all ${FREE_LIMITS.BREAKDOWNS_PER_DAY} free breakdowns today. Upgrade to Premium for unlimited access.`,
    tts: `You've used all ${FREE_LIMITS.TTS_PER_DAY} free audio generations today. Upgrade to Premium for unlimited access.`,
  };

  return {
    error: 'QUOTA_EXCEEDED',
    quotaType: type,
    message: messages[type],
    current: quota.current,
    limit: quota.limit,
  };
}
