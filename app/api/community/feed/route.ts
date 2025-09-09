import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../pages/api/auth/[...nextauth]";
import { getCommunityFeed } from '@/lib/community';
import { getUserLanguageId } from '@/lib/user';
import type { CommunityFilters, CommunityPagination } from '@/lib/community';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to view community feed' },
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

    // Get user's current language - this is the key change!
    const userLanguageId = await getUserLanguageId(userId);

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters - REMOVE languageId from manual filters
    const filters: CommunityFilters = {
      bookmarkTitle: searchParams.get('bookmarkTitle') || undefined,
      creatorAlias: searchParams.get('creatorAlias') || undefined,
      languageId: userLanguageId, // Always use user's current language
      minImports: searchParams.get('minImports') ? parseInt(searchParams.get('minImports')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'recent' | 'imports') || 'recent',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    // Parse pagination from query parameters
    const pagination: CommunityPagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    // Validate pagination
    if (pagination.page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get community feed
    const result = await getCommunityFeed(filters, pagination, userId);

    return NextResponse.json({
      success: true,
      data: result,
      filters,
      pagination
    });

  } catch (error: any) {
    console.error('Error in community feed API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch community feed' 
      },
      { status: 500 }
    );
  }
}
