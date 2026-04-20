import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getBreakdown } from '@/lib';
import { getCommunityBreakdown } from '@/lib/community';
import prisma from '@/lib/database/prisma';
import {
  checkBreakdownQuota,
  incrementBreakdownUsage,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

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

    // Enforce daily breakdown quota for authenticated users
    if (userId) {
      const quota = await checkBreakdownQuota(userId);
      if (!quota.allowed) {
        return NextResponse.json(quotaExceededResponse('breakdowns', quota), { status: 429 });
      }
    }

    let result;

    // Check if responseId is provided and valid (not null, undefined, empty string, or temp)
    if (responseId && responseId !== 'null' && responseId !== 'undefined' && !responseId.includes('temp')) {
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
        // Handle community response with caching
        result = await getCommunityBreakdown(responseId, isMobile);
      } else if (gptResponse) {
        // Handle regular GPT response with caching
        result = await getBreakdown(text, language, responseId, isMobile);
      } else {
        result = await getBreakdown(text, language, undefined, isMobile);
      }
    } else {
      result = await getBreakdown(text, language, undefined, isMobile);
    }

    // Increment usage after successful generation (only counts new API calls, not cached)
    if (userId) {
      await incrementBreakdownUsage(userId);
    }

    return NextResponse.json({
      breakdown: result.breakdown,
      desktopBreakdown: result.desktopBreakdown,
      mobileBreakdown: result.mobileBreakdown
    });
  } catch (error: any) {
    console.error('Error in breakdown API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate breakdown' },
      { status: 500 }
    );
  }
}
