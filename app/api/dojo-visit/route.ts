import { NextResponse } from 'next/server';
import { updateStreakOnActivity, type StreakData } from '@/lib/user/streakService';

export async function POST(request: Request) {
  try {
    const { userId, timezone } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update streak if this is the first Dojo visit today
    const streakData: StreakData = await updateStreakOnActivity(userId, timezone || 'UTC');

    return NextResponse.json({ 
      success: true,
      streakData
    });
  } catch (error: any) {
    console.error('Error tracking Dojo visit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track Dojo visit' },
      { status: 500 }
    );
  }
}

