import prisma from '../database/prisma';
import { hasPublicAlias } from './aliasService';
import { createBookmark, checkBookmarkExists } from '../bookmarks/bookmarkService';
import { getUserLanguageId } from '../user/languageService';
import type { 
  CommunityFilters, 
  CommunityPagination,
  ShareToCommunityResponse,
  ImportFromCommunityResponse,
  CommunityFeedResponse,
  UserSharingStats
} from '../../types/community';

/**
 * Shares a GPTResponse to the community feed
 */
export async function shareToCommunity(userId: string, responseId: string): Promise<ShareToCommunityResponse> {
  try {
    // Check if user has a public alias
    const hasAlias = await hasPublicAlias(userId);
    if (!hasAlias) {
      return {
        success: false,
        error: 'You need to create a public alias before sharing to the community feed'
      };
    }

    // Get the GPTResponse with related data
    const gptResponse = await prisma.gPTResponse.findUnique({
      where: { id: responseId },
      include: {
        user: { select: { alias: true, id: true } },
        language: { select: { id: true, code: true } },
        bookmarks: { select: { title: true }, take: 1 }
      }
    });

    if (!gptResponse) {
      return { success: false, error: 'Response not found' };
    }

    // Verify ownership
    if (gptResponse.userId !== userId) {
      return { success: false, error: 'You can only share your own responses' };
    }

    // Check if already shared
    const existingCommunityResponse = await prisma.communityResponse.findUnique({
      where: { originalResponseId: responseId }
    });

    if (existingCommunityResponse) {
      return { success: false, error: 'This response has already been shared to the community' };
    }

    // Get bookmark title (use first bookmark or default)
    const bookmarkTitle = gptResponse.bookmarks[0]?.title || 'Untitled';

    // Create community response using transaction
    const communityResponse = await prisma.$transaction(async (tx) => {
      const newCommunityResponse = await tx.communityResponse.create({
        data: {
          originalResponseId: responseId,
          creatorAlias: gptResponse.user.alias!,
          creatorUserId: userId,
          bookmarkTitle,
          languageId: gptResponse.languageId,
          content: gptResponse.content,
          breakdown: gptResponse.breakdown,
          mobileBreakdown: gptResponse.mobileBreakdown,
          furigana: gptResponse.furigana,
          audio: gptResponse.audio,
          audioMimeType: gptResponse.audioMimeType
        },
        include: {
          creator: { select: { alias: true } },
          language: { select: { code: true, name: true } }
        }
      });

      return newCommunityResponse;
    });

    return {
      success: true,
      communityResponse
    };
  } catch (error) {
    console.error('Error sharing to community:', error);
    return {
      success: false,
      error: 'Failed to share response to community. Please try again.'
    };
  }
}

/**
 * Imports a community response to user's library
 */
export async function importFromCommunity(userId: string, communityResponseId: string): Promise<ImportFromCommunityResponse> {
  try {
    // Get the community response
    const communityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      include: {
        creator: { select: { alias: true } },
        language: { select: { id: true, code: true } }
      }
    });

    if (!communityResponse || !communityResponse.isActive) {
      return { success: false, error: 'Community response not found or no longer available' };
    }

    // Check if user is trying to import their own response
    if (communityResponse.creatorUserId === userId) {
      return { success: false, error: 'You cannot import your own shared response' };
    }

    // Check if user already imported this response
    const existingImport = await prisma.communityImport.findUnique({
      where: {
        userId_communityResponseId: {
          userId,
          communityResponseId
        }
      }
    });

    if (existingImport) {
      return { success: false, error: 'You have already imported this response' };
    }

    // Get user's language ID to ensure consistency
    const userLanguageId = await getUserLanguageId(userId);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      let bookmark;
      let wasBookmarkCreated = false;

      // Check if user already has a bookmark with this title in their language
      const existingBookmark = await tx.bookmark.findFirst({
        where: {
          userId,
          title: communityResponse.bookmarkTitle,
          languageId: userLanguageId
        }
      });

      if (existingBookmark) {
        bookmark = existingBookmark;
      } else {
        // Create new bookmark
        bookmark = await tx.bookmark.create({
          data: {
            title: communityResponse.bookmarkTitle,
            userId,
            languageId: userLanguageId
          }
        });
        wasBookmarkCreated = true;
      }

      // Create the imported GPTResponse
      const importedResponse = await tx.gPTResponse.create({
        data: {
          content: communityResponse.content,
          userId,
          languageId: userLanguageId,
          source: 'imported',
          communityResponseId,
          breakdown: communityResponse.breakdown,
          mobileBreakdown: communityResponse.mobileBreakdown,
          furigana: communityResponse.furigana,
          audio: communityResponse.audio,
          audioMimeType: communityResponse.audioMimeType,
          bookmarks: {
            connect: { id: bookmark.id }
          }
        },
        include: {
          language: { select: { code: true, name: true } },
          bookmarks: { select: { title: true } }
        }
      });

      // Create import tracking record
      const communityImport = await tx.communityImport.create({
        data: {
          userId,
          communityResponseId,
          importedResponseId: importedResponse.id,
          importedBookmarkId: bookmark.id,
          wasBookmarkCreated
        }
      });

      // Increment import count on community response
      await tx.communityResponse.update({
        where: { id: communityResponseId },
        data: {
          importCount: {
            increment: 1
          }
        }
      });

      return {
        response: importedResponse,
        bookmark,
        wasBookmarkCreated,
        communityImport
      };
    });

    return {
      success: true,
      response: result.response,
      bookmark: result.bookmark,
      wasBookmarkCreated: result.wasBookmarkCreated
    };
  } catch (error) {
    console.error('Error importing from community:', error);
    return {
      success: false,
      error: 'Failed to import response. Please try again.'
    };
  }
}

/**
 * Gets community feed with filtering and pagination
 */
export async function getCommunityFeed(
  filters: CommunityFilters = {},
  pagination: CommunityPagination = { page: 1, limit: 20 }
): Promise<CommunityFeedResponse> {
  try {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      isActive: true
    };

    if (filters.bookmarkTitle) {
      whereClause.bookmarkTitle = {
        contains: filters.bookmarkTitle,
        mode: 'insensitive'
      };
    }

    if (filters.creatorAlias) {
      whereClause.creatorAlias = {
        contains: filters.creatorAlias,
        mode: 'insensitive'
      };
    }

    if (filters.languageId) {
      whereClause.languageId = filters.languageId;
    }

    if (filters.minImports && filters.minImports > 0) {
      whereClause.importCount = {
        gte: filters.minImports
      };
    }

    // Build order by clause
    let orderBy: any = { sharedAt: 'desc' }; // default

    if (filters.sortBy === 'popular') {
      orderBy = { viewCount: filters.sortOrder || 'desc' };
    } else if (filters.sortBy === 'imports') {
      orderBy = { importCount: filters.sortOrder || 'desc' };
    } else if (filters.sortBy === 'recent') {
      orderBy = { sharedAt: filters.sortOrder || 'desc' };
    }

    // Get responses and total count
    const [responses, totalCount] = await Promise.all([
      prisma.communityResponse.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          creator: { select: { alias: true } },
          language: { select: { code: true, name: true } }
        }
      }),
      prisma.communityResponse.count({
        where: whereClause
      })
    ]);

    // Increment view count for returned responses (fire and forget)
    const responseIds = responses.map(r => r.id);
    if (responseIds.length > 0) {
      prisma.communityResponse.updateMany({
        where: { id: { in: responseIds } },
        data: { viewCount: { increment: 1 } }
      }).catch(error => {
        console.error('Error updating view counts:', error);
      });
    }

    return {
      responses,
      totalCount,
      hasMore: offset + limit < totalCount
    };
  } catch (error) {
    console.error('Error getting community feed:', error);
    return {
      responses: [],
      totalCount: 0,
      hasMore: false
    };
  }
}

/**
 * Checks if a GPTResponse has already been shared to community
 */
export async function isResponseShared(responseId: string): Promise<{
  isShared: boolean;
  communityResponse?: any;
}> {
  try {
    const communityResponse = await prisma.communityResponse.findUnique({
      where: { originalResponseId: responseId },
      include: {
        creator: { select: { alias: true } },
        language: { select: { code: true, name: true } }
      }
    });

    return {
      isShared: !!communityResponse,
      communityResponse: communityResponse || undefined
    };
  } catch (error) {
    console.error('Error checking if response is shared:', error);
    return { isShared: false };
  }
}

/**
 * Deletes a community response (only by creator)
 */
export async function deleteCommunityResponse(userId: string, communityResponseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get the community response to verify ownership
    const communityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      select: { creatorUserId: true, bookmarkTitle: true }
    });

    if (!communityResponse) {
      return { success: false, error: 'Community response not found' };
    }

    // Verify ownership
    if (communityResponse.creatorUserId !== userId) {
      return { success: false, error: 'You can only delete your own shared responses' };
    }

    // Delete the community response (this will also delete related CommunityImports due to foreign keys)
    await prisma.communityResponse.delete({
      where: { id: communityResponseId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting community response:', error);
    return {
      success: false,
      error: 'Failed to delete community response. Please try again.'
    };
  }
}

/**
 * Gets user's sharing statistics
 */
export async function getUserSharingStats(userId: string): Promise<UserSharingStats> {
  try {
    const [localCount, importedCount, sharedCount, importsByOthersCount] = await Promise.all([
      // Count local responses
      prisma.gPTResponse.count({
        where: { userId, source: 'local' }
      }),
      // Count imported responses  
      prisma.gPTResponse.count({
        where: { userId, source: 'imported' }
      }),
      // Count shared responses
      prisma.communityResponse.count({
        where: { creatorUserId: userId, isActive: true }
      }),
      // Count total imports of user's shared content
      prisma.communityResponse.aggregate({
        where: { creatorUserId: userId, isActive: true },
        _sum: { importCount: true }
      })
    ]);

    return {
      totalLocal: localCount,
      totalImported: importedCount,
      totalShared: sharedCount,
      totalImportsByOthers: importsByOthersCount._sum.importCount || 0
    };
  } catch (error) {
    console.error('Error getting user sharing stats:', error);
    return {
      totalLocal: 0,
      totalImported: 0,
      totalShared: 0,
      totalImportsByOthers: 0
    };
  }
}
