import { NextRequest, NextResponse } from 'next/server';
import { getCommunityProfile } from '@/lib/community';

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get community profile (only returns data if user has public alias)
    const profile = await getCommunityProfile(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found or not public' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error: any) {
    console.error('Error in community profile API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch user profile' 
      },
      { status: 500 }
    );
  }
}
