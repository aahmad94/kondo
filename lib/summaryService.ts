import { Bookmark } from '@prisma/client';
import prisma from './prisma';

interface Response {
  id: string;
  content: string;
  createdAt: Date;
  rank: number;
  bookmarks: Record<string, string>;
}

export async function generateUserSummary(userId: string, forceRefresh: boolean = false) {
  try {
    // Get user's language preference
    const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      select: { languageId: true }
    });

    // Default to Japanese if no preference is set
    const languageId = userLanguagePreference?.languageId || (
      await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      })
    )?.id;

    if (!languageId) {
      throw new Error('Language not found');
    }

    // Only check for existing summary if not forcing a refresh
    if (!forceRefresh) {
      // Get the latest daily summary for the current language
      const latestSummary = await prisma.dailySummary.findFirst({
        where: {
          userId,
          languageId
        },
        include: {
          responses: {
            where: {
              languageId
            },
            select: {
              id: true,
              content: true,
              createdAt: true,
              rank: true,
              bookmarks: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (latestSummary && latestSummary.responses.length > 0) {
        // Transform bookmarks into a dictionary format
        const transformedResponses = latestSummary.responses.map(response => ({
          ...response,
          bookmarks: response.bookmarks.reduce((acc, bookmark) => {
            acc[bookmark.id] = bookmark.title;
            return acc;
          }, {} as Record<string, string>)
        }));
        
        return transformedResponses;
      }
    }

    // Get the daily summary bookmark for this language
    const dailySummaryBookmark = await prisma.bookmark.findFirst({
      where: {
        userId,
        languageId,
        title: 'daily summary'
      }
    });

    if (!dailySummaryBookmark) {
      throw new Error('Daily summary bookmark not found');
    }

    // Generate a new summary
    const bookmarkFilter = {
      userId,
      languageId,
      bookmarks: {
        some: {
          AND: [
            {
              title: {
                not: 'daily summary'
              }
            },
            {
              title: {
                not: ''
              }
            },
          ]
        }
      }
    };

    console.log('Using bookmark filter:', JSON.stringify(bookmarkFilter, null, 2));
        
    // Helper function to fetch random responses for a given rank and take
    const getRandomUserResponses = async (rank: number, take: number) => {
      const query = {
        where: {
          ...bookmarkFilter,
          rank: rank
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          rank: true,
          bookmarks: {
            select: {
              id: true,
              title: true
            }
          }
        }
      };
      
      console.log(`Query for rank ${rank}:`, JSON.stringify(query, null, 2));
      
      const allResponses = await prisma.gPTResponse.findMany(query);
      
      // Transform bookmarks into a dictionary format
      const transformedResponses = allResponses.map(response => ({
        ...response,
        bookmarks: response.bookmarks.reduce((acc, bookmark) => {
          acc[bookmark.id] = bookmark.title;
          return acc;
        }, {} as Record<string, string>)
      }));

      console.log(`Found ${transformedResponses.length} responses with rank ${rank}`);

      // Shuffle the responses using Fisher-Yates algorithm
      for (let i = transformedResponses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [transformedResponses[i], transformedResponses[j]] = [transformedResponses[j], transformedResponses[i]];
      }

      // Return only the requested number of responses
      const selectedResponses = transformedResponses.slice(0, take);
      console.log(`Selected ${selectedResponses.length} responses with rank ${rank}`);
      return selectedResponses;
    }

    // Fetch random responses for different ranks
    const rank1Responses = await getRandomUserResponses(1, 3); // 3 less familiar responses
    const rank2Responses = await getRandomUserResponses(2, 2); // 2 familiar responses
    const rank3Responses = await getRandomUserResponses(3, 1); // 1 very familiar response

    const allResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
    console.log('Total responses selected:', allResponses.length);
    
    if (allResponses.length === 0) {
      console.log('No responses found');
      return null;
    }

    // Save the new daily summary with the many-to-many relationship
    const savedSummary = await prisma.dailySummary.create({
      data: {
        user: {
          connect: { id: userId }
        },
        language: {
          connect: { id: languageId }
        },
        responses: {
          connect: allResponses.map(response => ({ id: response.id }))
        }
      },
      include: {
        responses: true
      }
    });
    console.log('Saved new daily summary with responses:', savedSummary.responses.length);

    // Add the daily summary bookmark to all selected responses
    await Promise.all(allResponses.map(response => 
      prisma.gPTResponse.update({
        where: { id: response.id },
        data: {
          bookmarks: {
            connect: { id: dailySummaryBookmark.id }
          }
        }
      })
    ));

    return allResponses;
  } catch (error) {
    console.error('Error in generateUserSummary:', error);
    throw error;
  }
} 