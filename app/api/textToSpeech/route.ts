import { NextResponse } from 'next/server';
import { convertTextToSpeech } from '@/lib';
import { getCommunityAudio } from '@/lib/community';
import prisma from '@/lib/database/prisma';

export async function POST(request: Request) {
  try {
    const { text, language, responseId } = await request.json();

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Text and language are required' },
        { status: 400 }
      );
    }

    let result;
    
    if (responseId) {
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
        result = await getCommunityAudio(responseId, text, language);
      } else if (gptResponse) {
        // Handle regular GPT response
        result = await convertTextToSpeech(text, language, responseId);
      } else {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        );
      }
    } else {
      // Handle case where responseId is not provided (e.g., unsaved GPT responses)
      result = await convertTextToSpeech(text, language, responseId);
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