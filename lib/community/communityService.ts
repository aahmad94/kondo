import prisma from '../database/prisma';
import { hasPublicAlias } from './aliasService';
import { createBookmark, checkBookmarkExists } from '../bookmarks/bookmarkService';
import { getUserLanguageId } from '../user/languageService';
import { updateStreakOnActivity } from '../user/streakService';
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

    // Get the GPTResponse with related data (fetch all bookmarks to filter)
    const gptResponse = await prisma.gPTResponse.findUnique({
      where: { id: responseId },
      include: {
        user: { select: { alias: true, id: true } },
        language: { select: { id: true, code: true } },
        bookmarks: { select: { title: true } }
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

    // Get bookmark title (prioritize non-reserved bookmarks)
    const reservedBookmarkTitles = ['all responses', 'daily summary', 'community', 'dojo', 'search'];
    const nonReservedBookmark = gptResponse.bookmarks.find(bookmark => 
      !reservedBookmarkTitles.includes(bookmark.title)
    );
    const bookmarkTitle = nonReservedBookmark?.title || gptResponse.bookmarks[0]?.title || 'Untitled';

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
          audioMimeType: gptResponse.audioMimeType,
          responseType: gptResponse.responseType
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
export async function importFromCommunity(userId: string, communityResponseId: string, timezone?: string): Promise<ImportFromCommunityResponse> {
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

      // Update the bookmark's updatedAt field to reflect the interaction
      await tx.bookmark.update({
        where: { id: bookmark.id },
        data: { updatedAt: new Date() }
      });

      return {
        response: importedResponse,
        bookmark,
        wasBookmarkCreated,
        communityImport
      };
    });

    // Update user's streak since they added a response to a deck
    const streakData = await updateStreakOnActivity(userId, timezone || 'UTC');

    return {
      success: true,
      response: result.response,
      bookmark: result.bookmark,
      wasBookmarkCreated: result.wasBookmarkCreated,
      streakData
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
 * Imports a community response to a specific bookmark
 */
export async function importFromCommunityToBookmark(
  userId: string, 
  communityResponseId: string, 
  targetBookmarkId: string,
  timezone?: string
): Promise<ImportFromCommunityResponse> {
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

    // Verify the target bookmark exists and belongs to the user
    const targetBookmark = await prisma.bookmark.findFirst({
      where: {
        id: targetBookmarkId,
        userId
      }
    });

    if (!targetBookmark) {
      return { success: false, error: 'Target bookmark not found or does not belong to you' };
    }

    // Get user's language ID to ensure consistency
    const userLanguageId = await getUserLanguageId(userId);

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
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
            connect: { id: targetBookmarkId }
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
          importedBookmarkId: targetBookmarkId,
          wasBookmarkCreated: false // Since we're using an existing bookmark
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

      // Update the bookmark's updatedAt field to reflect the interaction
      await tx.bookmark.update({
        where: { id: targetBookmarkId },
        data: { updatedAt: new Date() }
      });

      return {
        response: importedResponse,
        bookmark: targetBookmark,
        wasBookmarkCreated: false,
        communityImport
      };
    });

    // Update user's streak since they added a response to a deck
    const streakData = await updateStreakOnActivity(userId, timezone || 'UTC');

    return {
      success: true,
      response: result.response,
      bookmark: result.bookmark,
      wasBookmarkCreated: result.wasBookmarkCreated,
      streakData
    };
  } catch (error) {
    console.error('Error importing from community to bookmark:', error);
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
  pagination: CommunityPagination = { page: 1, limit: 20 },
  userId?: string
): Promise<CommunityFeedResponse> {
  try {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      isActive: true
    };

    if (filters.deckTitle) {
      whereClause.bookmarkTitle = {
        contains: filters.deckTitle,
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

    if (filters.sortBy === 'imports') {
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


    // Check which community responses the user has already imported (if userId provided)
    const responseIds = responses.map(r => r.id);
    let userImportedResponseIds: Set<string> = new Set();
    if (userId && responseIds.length > 0) {
      const userImports = await prisma.communityImport.findMany({
        where: {
          userId,
          communityResponseId: { in: responseIds }
        },
        select: { communityResponseId: true }
      });
      userImportedResponseIds = new Set(userImports.map(import_ => import_.communityResponseId));
    }

    // Add hasUserImported field to each response
    const responsesWithImportStatus = responses.map(response => ({
      ...response,
      hasUserImported: userImportedResponseIds.has(response.id)
    }));

    return {
      responses: responsesWithImportStatus,
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
 * Checks if a GPT response can be deleted and returns deletion impact info
 */
export async function checkGPTResponseDeletionImpact(userId: string, responseId: string): Promise<{
  canDelete: boolean;
  isSharedResponse: boolean;
  importCount: number;
  importerCount: number;
  error?: string;
}> {
  try {
    // Get the GPT response and check if it's a shared response
    const gptResponse = await prisma.gPTResponse.findUnique({
      where: { id: responseId },
      select: { 
        userId: true,
        originalCommunityPost: {
          select: {
            id: true,
            importCount: true,
            imports: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!gptResponse) {
      return { canDelete: false, isSharedResponse: false, importCount: 0, importerCount: 0, error: 'Response not found' };
    }

    // Verify ownership
    if (gptResponse.userId !== userId) {
      return { canDelete: false, isSharedResponse: false, importCount: 0, importerCount: 0, error: 'You can only delete your own responses' };
    }

    // Check if this is a shared response (has a community post)
    const isSharedResponse = !!gptResponse.originalCommunityPost;
    const importCount = gptResponse.originalCommunityPost?.importCount || 0;
    
    // Count unique importers
    const uniqueImporters = new Set(gptResponse.originalCommunityPost?.imports.map(imp => imp.userId) || []);
    const importerCount = uniqueImporters.size;

    return {
      canDelete: true,
      isSharedResponse,
      importCount,
      importerCount
    };
  } catch (error) {
    console.error('Error checking deletion impact:', error);
    return { 
      canDelete: false, 
      isSharedResponse: false, 
      importCount: 0, 
      importerCount: 0, 
      error: 'Failed to check deletion impact' 
    };
  }
}

/**
 * Deletes a GPT response with proper cascade handling for shared responses
 */
export async function deleteGPTResponseWithCascade(userId: string, responseId: string, bookmarks?: Record<string, string>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // First check deletion impact
    const impact = await checkGPTResponseDeletionImpact(userId, responseId);
    
    if (!impact.canDelete) {
      return { success: false, error: impact.error };
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      if (impact.isSharedResponse) {
        // This is a shared response - we need to handle cascade deletion
        // First, get the community response ID
        const communityResponse = await tx.communityResponse.findFirst({
          where: { originalResponseId: responseId }
        });

        if (communityResponse) {
          // Delete all imported responses first (this will cascade delete CommunityImports due to schema)
          await tx.gPTResponse.deleteMany({
            where: { communityResponseId: communityResponse.id }
          });

          // Delete the community response
          await tx.communityResponse.delete({
            where: { id: communityResponse.id }
          });
        }
      } else {
        // Regular deletion logic for non-shared responses
        // Check if this is an imported response and get community import info
        const communityImport = await tx.communityImport.findUnique({
          where: { importedResponseId: responseId },
          include: { communityResponse: true }
        });

        // If this was an imported response, decrement the import count on the community response
        if (communityImport) {
          await tx.communityResponse.update({
            where: { id: communityImport.communityResponseId },
            data: {
              importCount: {
                decrement: 1
              }
            }
          });
        }
      }

      // Disconnect all bookmarks first
      if (bookmarks && Object.keys(bookmarks).length > 0) {
        await tx.gPTResponse.update({
          where: { id: responseId },
          data: {
            bookmarks: {
              disconnect: Object.keys(bookmarks).map(id => ({ id }))
            }
          }
        });

        // Update all affected bookmarks' updatedAt field to reflect the interaction
        await tx.bookmark.updateMany({
          where: {
            id: {
              in: Object.keys(bookmarks)
            }
          },
          data: { updatedAt: new Date() }
        });
      }

      // Delete the response itself
      await tx.gPTResponse.delete({
        where: { id: responseId }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting GPT response with cascade:', error);
    return { success: false, error: 'Failed to delete response. Please try again.' };
  }
}

/**
 * Deletes a community response (only by creator) with proper foreign key handling
 */
export async function deleteCommunityResponse(userId: string, communityResponseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get the community response to verify ownership and get import info
    const communityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      select: { 
        creatorUserId: true, 
        bookmarkTitle: true,
        importCount: true,
        imports: {
          select: {
            importedResponseId: true
          }
        }
      }
    });

    if (!communityResponse) {
      return { success: false, error: 'Community response not found' };
    }

    // Verify ownership
    if (communityResponse.creatorUserId !== userId) {
      return { success: false, error: 'You can only delete your own shared responses' };
    }

    // Use transaction to handle foreign key constraints properly
    await prisma.$transaction(async (tx) => {
      // Delete all imported responses first (this will cascade delete CommunityImports)
      if (communityResponse.imports.length > 0) {
        await tx.gPTResponse.deleteMany({
          where: {
            id: {
              in: communityResponse.imports.map(imp => imp.importedResponseId)
            }
          }
        });
      }

      // Now we can safely delete the community response
      await tx.communityResponse.delete({
        where: { id: communityResponseId }
      });
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
 * Imports an entire community bookmark (all responses with the same bookmark title)
 */
export async function importEntireCommunityBookmark(
  userId: string, 
  communityBookmarkTitle: string, 
  targetBookmarkId?: string,
  timezone?: string
): Promise<ImportFromCommunityResponse & { importedCount?: number }> {
  try {
    // Get user's language ID to ensure consistency
    const userLanguageId = await getUserLanguageId(userId);

    // Get all community responses with this bookmark title in user's language
    const communityResponses = await prisma.communityResponse.findMany({
      where: {
        bookmarkTitle: communityBookmarkTitle,
        languageId: userLanguageId,
        isActive: true
      },
      include: {
        creator: { select: { alias: true } },
        language: { select: { id: true, code: true } }
      }
    });

    if (communityResponses.length === 0) {
      return { success: false, error: 'No responses found for this bookmark' };
    }

    // Check if user already imported any of these responses
    const responseIds = communityResponses.map(r => r.id);
    const existingImports = await prisma.communityImport.findMany({
      where: {
        userId,
        communityResponseId: { in: responseIds }
      }
    });

    // Filter out already imported responses
    const responsesToImport = communityResponses.filter(response => 
      response.creatorUserId !== userId && // Can't import own responses
      !existingImports.some(imp => imp.communityResponseId === response.id)
    );

    if (responsesToImport.length === 0) {
      return { success: false, error: 'All responses from this bookmark have already been imported or are your own' };
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      let bookmark;
      let wasBookmarkCreated = false;

      if (targetBookmarkId) {
        // Use existing bookmark
        bookmark = await tx.bookmark.findFirst({
          where: {
            id: targetBookmarkId,
            userId
          }
        });

        if (!bookmark) {
          throw new Error('Target bookmark not found or does not belong to you');
        }
      } else {
        // Check if user already has a bookmark with this title
        const existingBookmark = await tx.bookmark.findFirst({
          where: {
            userId,
            title: communityBookmarkTitle,
            languageId: userLanguageId
          }
        });

        if (existingBookmark) {
          bookmark = existingBookmark;
        } else {
          // Create new bookmark
          bookmark = await tx.bookmark.create({
            data: {
              title: communityBookmarkTitle,
              userId,
              languageId: userLanguageId
            }
          });
          wasBookmarkCreated = true;
        }
      }

      const importedResponses = [];
      const communityImports = [];

      // Import all responses
      for (const communityResponse of responsesToImport) {
        // Create the imported GPTResponse
        const importedResponse = await tx.gPTResponse.create({
          data: {
            content: communityResponse.content,
            userId,
            languageId: userLanguageId,
            source: 'imported',
            communityResponseId: communityResponse.id,
            breakdown: communityResponse.breakdown,
            mobileBreakdown: communityResponse.mobileBreakdown,
            furigana: communityResponse.furigana,
            audio: communityResponse.audio,
            audioMimeType: communityResponse.audioMimeType,
            bookmarks: {
              connect: { id: bookmark.id }
            }
          }
        });

        importedResponses.push(importedResponse);

        // Create import tracking record
        const communityImport = await tx.communityImport.create({
          data: {
            userId,
            communityResponseId: communityResponse.id,
            importedResponseId: importedResponse.id,
            importedBookmarkId: bookmark.id,
            wasBookmarkCreated: wasBookmarkCreated && importedResponses.length === 1 // Only first one creates bookmark
          }
        });

        communityImports.push(communityImport);

        // Increment import count on community response
        await tx.communityResponse.update({
          where: { id: communityResponse.id },
          data: {
            importCount: {
              increment: 1
            }
          }
        });
      }

      // Update the bookmark's updatedAt field to reflect the interaction
      await tx.bookmark.update({
        where: { id: bookmark.id },
        data: { updatedAt: new Date() }
      });

      return {
        responses: importedResponses,
        bookmark,
        wasBookmarkCreated,
        communityImports,
        importedCount: importedResponses.length
      };
    });

    // Update user's streak since they added responses to a deck
    const streakData = await updateStreakOnActivity(userId, timezone || 'UTC');

    return {
      success: true,
      response: result.responses[0], // Return first response for compatibility
      bookmark: result.bookmark,
      wasBookmarkCreated: result.wasBookmarkCreated,
      importedCount: result.importedCount,
      streakData
    };
  } catch (error) {
    console.error('Error importing entire community bookmark:', error);
    return {
      success: false,
      error: 'Failed to import bookmark. Please try again.'
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

