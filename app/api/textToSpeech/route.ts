import { NextResponse } from 'next/server';
import { convertTextToSpeech } from '@/lib/GPTResponseService';

export async function POST(request: Request) {
  try {
    const { text, language } = await request.json();

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Text and language are required' },
        { status: 400 }
      );
    }

    const audioBlob = await convertTextToSpeech(text, language);
    
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({ 
      success: true,
      audio: base64,
      mimeType: audioBlob.type
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