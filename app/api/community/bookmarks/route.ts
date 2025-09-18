import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../pages/api/auth/[...nextauth]";
import { getUserLanguageId } from '@/lib/user';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to view community bookmarks' },
        { status: 401 }
      );
    }

    // Get userId from session
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unable to identify user' },
        { status: 400 }
      );
    }

    // Get user's current language
    const userLanguageId = await getUserLanguageId(userId);

    // Get distinct bookmark titles from community responses for the user's language
    const bookmarks = await prisma.communityResponse.findMany({
      where: {
        languageId: userLanguageId,
        isActive: true
      },
      select: {
        deckTitle: true
      },
      distinct: ['deckTitle'],
      orderBy: {
        deckTitle: 'asc'
      }
    });

    // Extract just the bookmark titles
    const deckTitles = bookmarks.map(bookmark => bookmark.deckTitle);

    return NextResponse.json({
      success: true,
      data: deckTitles
    });

  } catch (error: any) {
    console.error('Error in community bookmarks API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch community bookmarks' 
      },
      { status: 500 }
    );
  }
}
