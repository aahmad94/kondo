import { NextResponse } from 'next/server';
import { getBreakdown } from '@/lib/GPTResponseService';

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

    const breakdown = await getBreakdown(text, language, responseId, isMobile);

    return NextResponse.json({ breakdown });
  } catch (error: any) {
    console.error('Error in breakdown API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate breakdown' },
      { status: 500 }
    );
  }
} 