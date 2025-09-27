import { NextResponse } from 'next/server';
import { getBreakdown } from '@/lib';
import { getCommunityBreakdown } from '@/lib/community';
import prisma from '@/lib/database/prisma';

export async function POST(request: Request) {
  try {
    const { text, language, responseId, isMobile } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    if (!responseId) {
      return NextResponse.json(
        { error: 'Response ID is required' },
        { status: 400 }
      );
    }

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

    let result;
    if (communityResponse) {
      // Handle community response with caching
      result = await getCommunityBreakdown(responseId, isMobile);
    } else if (gptResponse) {
      // Handle regular GPT response
      result = await getBreakdown(text, language, responseId, isMobile);
    } else {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
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