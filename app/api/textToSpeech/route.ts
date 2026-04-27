import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { convertTextToSpeech } from '@/lib';
import { getCommunityAudio } from '@/lib/community';
import prisma from '@/lib/database/prisma';
import {
  isQuotaExceededError,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

// Quota note: TTS counting (and the up-front "have you maxed out today?"
// check) lives inside the service layer (`convertTextToSpeech` /
// `getCommunityAudio`). That layer dedups via the `QuotaConsumption` table
// so each (user, responseId) counts at most once per UTC day, regardless of
// how many times the play button is pressed.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId || (session?.user as any)?.id;

    const { text, language, responseId } = await request.json();

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Text and language are required' },
        { status: 400 }
      );
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
        result = await getCommunityAudio(responseId, text, language, userId);
      } else if (gptResponse) {
        result = await convertTextToSpeech(text, language, responseId, userId);
      } else {
        result = await convertTextToSpeech(text, language, undefined, userId);
      }
    } else {
      result = await convertTextToSpeech(text, language, undefined, userId);
    }

    return NextResponse.json({
      success: true,
      audio: result.audio,
      mimeType: result.mimeType
    });
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      return NextResponse.json(
        quotaExceededResponse(error.quotaType, error.quota),
        { status: 429 },
      );
    }
    console.error('Error in text-to-speech API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to convert text to speech'
      },
      { status: 500 }
    );
  }
}
