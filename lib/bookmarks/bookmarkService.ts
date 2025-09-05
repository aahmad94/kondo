import prisma from '../database/prisma';
import { getUserLanguageId } from '../user/languageService';

/**
 * Gets all bookmarks for a user in their preferred language
 */
export async function getBookmarks(userId: string) {
  try {
    // Get user's language ID (with fallback to Japanese)
    const languageId = await getUserLanguageId(userId);

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: userId,
        languageId: languageId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return bookmarks;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    throw error;
  }
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // First, get all GPTResponses associated with this bookmark to handle community imports
      const responsesToDelete = await tx.gPTResponse.findMany({
        where: {
          bookmarks: {
            some: {
              id: bookmarkId,
              userId: userId
            }
          }
        },
        include: {
          communityImport: true
        }
      });

      // Handle community import count decrements for imported responses
      for (const response of responsesToDelete) {
        if (response.communityImport) {
          // This is an imported response, decrement the community response import count
          await tx.communityResponse.update({
            where: { id: response.communityImport.communityResponseId },
            data: { importCount: { decrement: 1 } }
          });
        }
      }

      // Delete all GPTResponses associated with this bookmark
      // The onDelete: Cascade will handle CommunityImport deletion
      await tx.gPTResponse.deleteMany({
        where: {
          bookmarks: {
            some: {
              id: bookmarkId,
              userId: userId
            }
          }
        }
      });

      // Finally, delete the bookmark itself
      const deletedBookmark = await tx.bookmark.deleteMany({
        where: {
          id: bookmarkId,
          userId: userId
        }
      });

      return deletedBookmark;
    });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    throw error;
  }
}

export async function deleteGptResponse(userId: string, gptResponseId: string, bookmarkId: string) {
  try {
    // First remove the association between the bookmark and the response
    await prisma.bookmark.update({
      where: {
        id: bookmarkId,
        userId: userId
      },
      data: {
        responses: {
          disconnect: {
            id: gptResponseId
          }
        },
        updatedAt: new Date(),
      }
    });

    // Then delete the GPTResponse if it exists
    const deletedResponse = await prisma.gPTResponse.deleteMany({
      where: {
        id: gptResponseId,
        userId: userId
      }
    });

    return deletedResponse;
  } catch (error) {
    console.error('Error deleting GPT response:', error);
    throw error;
  }
}

export async function checkBookmarkExists(userId: string, title: string, languageId: string) {
  const bookmark = await prisma.bookmark.findFirst({
    where: {
      userId: userId,
      title: title,
      language: {
        id: languageId
      }
    }
  });
  
  return bookmark !== null;
}

export async function createBookmark(userId: string, title: string, languageId: string) {
  try {
    const newBookmark = await prisma.bookmark.create({
      data: {
        title,
        user: {
          connect: { id: userId },
        },
        language: {
          connect: { id: languageId }
        }
      },
    });
    
    return newBookmark;
  } catch (error) {
    console.error('Error creating bookmark:', error);
    throw error;
  }
}
