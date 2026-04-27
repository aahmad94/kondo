import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getBreakdown } from '@/lib';
import { getCommunityBreakdown } from '@/lib/community';
import prisma from '@/lib/database/prisma';
import {
  isQuotaExceededError,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

// Quota note: breakdown counting (and the up-front "have you maxed out today?"
// check) lives inside the service layer (`getBreakdown` / `getCommunityBreakdown`).
// That layer dedups via the `QuotaConsumption` table so each (user, responseId)
// counts at most once per UTC day, regardless of how many times the modal is
// opened or the API is hit.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId || (session?.user as any)?.id;

    const { text, language, responseId, isMobile } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    if (!language) {
      return NextResponse.json({ error: 'Language is required' }, { status: 400 });
    }

    let result;

    const hasResponseId = responseId && responseId !== 'null' && responseId !== 'undefined';
    const isTempResponseId = hasResponseId && responseId.includes('temp');

    // For temp ids we skip the community/gpt lookup (the row doesn't exist
    // in either table) but still forward the id to the service so per-day
    // dedup works against the stable client-side temp id.
    if (hasResponseId && !isTempResponseId) {
      // Determine if this is a community response or GPT response
      const [communityResponse, gptResponse] = await Promise.all([
        prisma.communityResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        }),
        prisma.gPTResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        })
      ]);

      if (communityResponse) {
        result = await getCommunityBreakdown(responseId, isMobile, userId);
      } else if (gptResponse) {
        result = await getBreakdown(text, language, responseId, isMobile, userId);
      } else {
        result = await getBreakdown(text, language, undefined, isMobile, userId);
      }
    } else {
      result = await getBreakdown(text, language, hasResponseId ? responseId : undefined, isMobile, userId);
    }

    return NextResponse.json({
      breakdown: result.breakdown,
      desktopBreakdown: result.desktopBreakdown,
      mobileBreakdown: result.mobileBreakdown
    });
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      return NextResponse.json(
        quotaExceededResponse(error.quotaType, error.quota),
        { status: 429 },
      );
    }
    console.error('Error in breakdown API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate breakdown' },
      { status: 500 }
    );
  }
}
