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
        result = await getCommunityAudio(responseId, text, language);
      } else if (gptResponse) {
        // Handle regular GPT response with caching
        result = await convertTextToSpeech(text, language, responseId);
      } else {
        // Response ID provided but not found in database - likely unsaved response
        // Generate without caching
        result = await convertTextToSpeech(text, language, undefined);
      }
    } else {
      // Handle case where responseId is not provided or is temp (e.g., unsaved GPT responses)
      // Pass undefined to prevent caching attempts
      result = await convertTextToSpeech(text, language, undefined);
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