import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../pages/api/auth/[...nextauth]";
import { getUserAlias, getCommunityProfile } from '@/lib/community';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unable to identify user' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeProfile = searchParams.get('includeProfile') === 'true';

    // Get user alias info
    const aliasInfo = await getUserAlias(userId);

    let response: any = {
      success: true,
      alias: aliasInfo.alias,
      isPublic: aliasInfo.isPublic
    };

    // Optionally include community profile if requested
    if (includeProfile && aliasInfo.alias && aliasInfo.isPublic) {
      const profile = await getCommunityProfile(userId);
      response.profile = profile;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in community user API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch user information' 
      },
      { status: 500 }
    );
  }
}
