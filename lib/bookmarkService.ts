import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function deleteBookmark(userId: string, bookmarkId: string) {
  try {
    // First, delete all GPTResponses associated with this bookmark
    await prisma.gPTResponse.deleteMany({
      where: {
        bookmarks: {
          some: {
            id: bookmarkId,
            userId: userId
          }
        }
      }
    });

    // Then, delete the bookmark itself
    const deletedBookmark = await prisma.bookmark.deleteMany({
      where: {
        id: bookmarkId,
        userId: userId
      }
    });

    return deletedBookmark;
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
        }
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
