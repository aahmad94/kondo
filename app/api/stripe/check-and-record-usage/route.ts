import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  gateDailyResponseFeature,
  isQuotaExceededError,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

/**
 * POST /api/stripe/check-and-record-usage
 *
 * Called by the client when a cached breakdown or TTS result is served
 * without hitting the full generation endpoint. Runs the same quota gate
 * that the generation endpoints use, so the usage counter stays accurate
 * AND free users over their daily limit are blocked from re-viewing
 * cached content (returns 429).
 *
 * Body: { feature: 'breakdown' | 'tts', responseId: string }
 *
 * Response:
 *   200: { recorded: true } — usage recorded; client may proceed.
 *   429: quota-exceeded payload — client should open PremiumModal and
 *        NOT show the cached content.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId || (session?.user as any)?.id;

    const { feature, responseId } = await request.json();

    if (feature !== 'breakdown' && feature !== 'tts') {
      return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
    }

    const { commit } = await gateDailyResponseFeature(feature, userId, responseId);
    await commit();

    return NextResponse.json({ recorded: true });
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      return NextResponse.json(
        quotaExceededResponse(err.quotaType, err.quota),
        { status: 429 },
      );
    }
    console.error('[check-and-record-usage] error:', err?.message);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
