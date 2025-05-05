import prisma from './prisma';

export async function searchResponses(userId: string, query: string, languageCode: string, limit: number = 10) {
  try {
    // First get the language ID from the code
    const language = await prisma.language.findUnique({
      where: { code: languageCode }
    });

    if (!language) {
      throw new Error('Language not found');
    }

    const responses = await prisma.gPTResponse.findMany({
      where: {
        userId,
        languageId: language.id,
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        bookmarks: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Transform the responses to include bookmarks in the correct format
    return responses.map(response => ({
      ...response,
      bookmarks: response.bookmarks.reduce((acc, bookmark) => ({
        ...acc,
        [bookmark.id]: bookmark.title
      }), {})
    }));
  } catch (error) {
    console.error('Error searching responses:', error);
    throw error;
  }
} 