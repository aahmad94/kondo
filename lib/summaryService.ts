import { Bookmark } from '@prisma/client';
import prisma from './prisma';

interface Response {
  id: string;
  content: string;
  createdAt: Date;
  rank: number | null;
  bookmarks: Record<string, string>;
}

export async function generateUserSummary(userId: string, forceRefresh: boolean = false, allLanguages: boolean = false) {
  try {
    let languageIds: string[] = [];
    
    if (allLanguages) {
      // Get all active languages
      const activeLanguages = await prisma.language.findMany({
        where: { 
          isActive: true,
          // Ensure the language has at least one response or bookmark for this user
          OR: [
            {
              responses: {
                some: {
                  userId
                }
              }
            },
            {
              bookmarks: {
                some: {
                  userId
                }
              }
            }
          ]
        },
        select: { 
          id: true,
          code: true,
          name: true 
        }
      });
      
      console.log(`[Summary] Found ${activeLanguages.length} active languages:`, 
        activeLanguages.map(l => `${l.name} (${l.code})`));
      
      languageIds = activeLanguages.map(lang => lang.id);
    } else {
      // Get user's current language preference
      const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });

      // Default to Japanese if no preference is set
      const defaultLanguageId = (await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      }))?.id;

      languageIds = [userLanguagePreference?.languageId || defaultLanguageId].filter(Boolean) as string[];
    }

    if (languageIds.length === 0) {
      throw new Error('No languages found');
    }

    const allResponses: Response[] = [];

    // Generate summaries for each language
    for (const languageId of languageIds) {
      try {
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
            
            allResponses.push(...transformedResponses);
            continue; // Skip to next language if we have a valid summary
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
          console.log(`Daily summary bookmark not found for language ${languageId}`);
          continue; // Skip to next language
        }

        // Generate a new summary for this language
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
          
          const responses = await prisma.gPTResponse.findMany(query);
          
          // Transform bookmarks into a dictionary format
          const transformedResponses = responses.map(response => ({
            ...response,
            bookmarks: response.bookmarks.reduce((acc, bookmark) => {
              acc[bookmark.id] = bookmark.title;
              return acc;
            }, {} as Record<string, string>)
          }));

          // Shuffle the responses using Fisher-Yates algorithm
          for (let i = transformedResponses.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [transformedResponses[i], transformedResponses[j]] = [transformedResponses[j], transformedResponses[i]];
          }

          return transformedResponses.slice(0, take);
        }

        // Fetch random responses for different ranks
        const rank1Responses = await getRandomUserResponses(1, 3); // 3 less familiar responses
        const rank2Responses = await getRandomUserResponses(2, 2); // 2 familiar responses
        const rank3Responses = await getRandomUserResponses(3, 1); // 1 very familiar response

        const languageResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
        
        if (languageResponses.length > 0) {
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
                connect: languageResponses.map(response => ({ id: response.id }))
              }
            },
            include: {
              responses: true
            }
          });

          // Add the daily summary bookmark to all selected responses
          await Promise.all(languageResponses.map(response => 
            prisma.gPTResponse.update({
              where: { id: response.id },
              data: {
                bookmarks: {
                  connect: { id: dailySummaryBookmark.id }
                }
              }
            })
          ));

          allResponses.push(...languageResponses);
        }
      } catch (error) {
        console.error(`Error generating summary for language ${languageId}:`, error);
        // Continue with next language even if one fails
      }
    }

    return allResponses;
  } catch (error) {
    console.error('Error in generateUserSummary:', error);
    throw error;
  }
} 