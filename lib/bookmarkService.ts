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
