import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { convertTextToSpeech } from '@/lib';
import { getCommunityAudio } from '@/lib/community';
import prisma from '@/lib/database/prisma';
import {
  checkTTSQuota,
  incrementTTSUsage,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

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

    // Enforce daily TTS quota for authenticated users
    if (userId) {
      const quota = await checkTTSQuota(userId);
      if (!quota.allowed) {
        return NextResponse.json(quotaExceededResponse('tts', quota), { status: 429 });
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
        result = await getCommunityAudio(responseId, text, language);
      } else if (gptResponse) {
        result = await convertTextToSpeech(text, language, responseId);
      } else {
        result = await convertTextToSpeech(text, language, undefined);
      }
    } else {
      result = await convertTextToSpeech(text, language, undefined);
    }

    // Increment usage after successful TTS generation
    if (userId) {
      await incrementTTSUsage(userId);
    }

    return NextResponse.json({
      success: true,
      audio: result.audio,
      mimeType: result.mimeType
    });
  } catch (error: any) {
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
