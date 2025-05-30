import { NextResponse } from 'next/server';
import { convertTextToSpeech } from '@/lib/GPTResponseService';

export async function POST(request: Request) {
  try {
    const { text, language, responseId } = await request.json();

    if (!text || !language || !responseId) {
      return NextResponse.json(
        { error: 'Text, language, and responseId are required' },
        { status: 400 }
      );
    }

    const result = await convertTextToSpeech(text, language, responseId);
    
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