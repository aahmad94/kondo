import prisma from '../database/prisma';

/**
 * Helper function to check sharing status for a batch of responses
 * Returns a Set of response IDs that have been shared to community
 */
async function getSharedResponseIds(responseIds: string[]): Promise<Set<string>> {
  if (responseIds.length === 0) return new Set();
  
  const communityResponses = await prisma.communityResponse.findMany({
    where: {
      originalResponseId: { in: responseIds },
      isActive: true
    },
    select: {
      originalResponseId: true
    }
  });
  
  return new Set(communityResponses.map(cr => cr.originalResponseId));
}

/**
 * Helper function to determine if a response should be marked as shared to community
 */
function calculateIsSharedToCommunity(response: { source: string; id: string }, sharedResponseIds: Set<string>): boolean {
  // For local responses: check if response ID is in our shared set
  // For imported responses: they can't be shared (handled by source check in frontend)
  return response.source === 'local' && sharedResponseIds.has(response.id);
}

interface Response {
  id: string;
  content: string;
  createdAt: Date;
  rank: number | null;
  decks: Record<string, string>;
}

/**
 * Retrieve existing user summary without regenerating
 * Used by email functions to get already-generated daily summaries
 */
export async function getUserSummary(userId: string, languageCode?: string) {
  try {
    console.log(`[getUserSummary] Retrieving summary for user ${userId}, language: ${languageCode || 'all'}`);
    
    let languageIds: string[] = [];
    
    if (languageCode) {
      // Get specific language by code
      const language = await prisma.language.findUnique({
        where: { code: languageCode },
        select: { id: true }
      });
      
      if (!language) {
        throw new Error(`Language not found for code: ${languageCode}`);
      }
      
      languageIds = [language.id];
    } else {
      // Get all languages for user
      const activeLanguages = await prisma.language.findMany({
        where: { 
          isActive: true,
          OR: [
            { responses: { some: { userId } } },
            { bookmarks: { some: { userId } } }
          ]
        },
        select: { id: true }
      });
      languageIds = activeLanguages.map(lang => lang.id);
    }
    
    if (languageIds.length === 0) {
      console.log(`[getUserSummary] No languages found for user ${userId}`);
      return { allResponses: [], createdAt: null };
    }
    
    const allResponses: Response[] = [];
    let latestCreatedAt: Date | null = null;
    
    for (const languageId of languageIds) {
      // Get the most recent daily summary for this language
      const latestSummary = await prisma.dailySummary.findFirst({
        where: { userId, languageId },
        select: {
          id: true,
          createdAt: true,
          responses: { 
            where: { languageId }, 
            select: { 
              id: true, 
              content: true, 
              createdAt: true, 
              rank: true, 
              isPaused: true,
              furigana: true,
              isFuriganaEnabled: true,
              isPhoneticEnabled: true,
              isKanaEnabled: true,
              breakdown: true,
              mobileBreakdown: true,
              responseType: true,
              source: true,
              communityResponseId: true,
              communityResponse: {
                select: {
                  id: true,
                  isActive: true,
                  creatorAlias: true
                }
              },
              bookmarks: { 
                select: { 
                  id: true, 
                  title: true 
                } 
              } 
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      if (latestSummary && latestSummary.responses.length > 0) {
        // Get sharing status for all responses in this batch
        const responseIds = latestSummary.responses.map(r => r.id);
        const sharedResponseIds = await getSharedResponseIds(responseIds);
        
        // Transform responses to match expected format
        const transformedResponses = latestSummary.responses.map(response => {
          const { bookmarks, ...rest } = response;
          const isSharedToCommunity = calculateIsSharedToCommunity(response, sharedResponseIds);
          
          return {
            ...rest,
            decks: bookmarks.reduce((acc, bookmark) => {
              acc[bookmark.id] = bookmark.title;
              return acc;
            }, {} as Record<string, string>),
            isSharedToCommunity
          };
        });
        
        allResponses.push(...transformedResponses);
        
        // Track the latest createdAt
        if (!latestCreatedAt || latestSummary.createdAt > latestCreatedAt) {
          latestCreatedAt = latestSummary.createdAt;
        }
      }
    }
    
    console.log(`[getUserSummary] Retrieved ${allResponses.length} responses for user ${userId}`);
    return { allResponses, createdAt: latestCreatedAt };
  } catch (error) {
    console.error(`[getUserSummary] Error retrieving summary for user ${userId}:`, error);
    throw error;
  }
}

export async function generateUserSummary(userId: string, forceRefresh: boolean = false, allLanguages: boolean = false) {
  try {
    // console.log(`[generateUserSummary] Start for user ${userId}, forceRefresh=${forceRefresh}, allLanguages=${allLanguages}`);
    let languageIds: string[] = [];
    
    if (allLanguages) {
      // console.log(`[generateUserSummary] Fetching all active languages for user ${userId}`);
      const activeLanguages = await prisma.language.findMany({
        where: { 
          isActive: true,
          OR: [
            { responses: { some: { userId } } },
            { bookmarks: { some: { userId } } }
          ]
        },
        select: { id: true, code: true, name: true }
      });
      // console.log(`[generateUserSummary] Found ${activeLanguages.length} active languages for user ${userId}`);
      languageIds = activeLanguages.map(lang => lang.id);
    } else {
      // console.log(`[generateUserSummary] Fetching language preference for user ${userId}`);
      const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });
      // console.log(`[generateUserSummary] User language preference: ${userLanguagePreference?.languageId}`);
      const defaultLanguageId = (await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      }))?.id;
      // console.log(`[generateUserSummary] Default language id: ${defaultLanguageId}`);
      languageIds = [userLanguagePreference?.languageId || defaultLanguageId].filter(Boolean) as string[];
    }
    // console.log(`[generateUserSummary] languageIds for user ${userId}:`, languageIds);
    if (languageIds.length === 0) {
      // console.error(`[generateUserSummary] No languages found for user ${userId}`);
      throw new Error('No languages found');
    }
    const allResponses: Response[] = [];
    let createdAt: Date | null = null;
    
    // Process languages in batches to prevent database overload
    const LANGUAGE_BATCH_SIZE = 2; // Process 2 languages at a time
    const languageBatches = [];
    
    for (let i = 0; i < languageIds.length; i += LANGUAGE_BATCH_SIZE) {
      languageBatches.push(languageIds.slice(i, i + LANGUAGE_BATCH_SIZE));
    }
    
    console.log(`[generateUserSummary] Processing ${languageIds.length} languages in ${languageBatches.length} batches for user ${userId}`);
    
    for (let batchIndex = 0; batchIndex < languageBatches.length; batchIndex++) {
      const languageBatch = languageBatches[batchIndex];
      console.log(`[generateUserSummary] Processing language batch ${batchIndex + 1}/${languageBatches.length} with ${languageBatch.length} languages for user ${userId}`);
      
      // Process languages in this batch sequentially to avoid overwhelming DB
      for (const languageId of languageBatch) {
      try {
        // console.log(`[generateUserSummary] Processing language ${languageId} for user ${userId}`);
        if (!forceRefresh) {
          // console.log(`[generateUserSummary] Checking for existing summary for user ${userId}, language ${languageId}`);
          const latestSummary = await prisma.dailySummary.findFirst({
            where: { userId, languageId },
            select: {
              id: true,
              createdAt: true,
              responses: { 
                where: { languageId }, 
                select: { 
                  id: true, 
                  content: true, 
                  createdAt: true, 
                  rank: true, 
                  isPaused: true,
                  furigana: true,
                  isFuriganaEnabled: true,
                  isPhoneticEnabled: true,
                  isKanaEnabled: true,
                  breakdown: true,
                  mobileBreakdown: true,
                  source: true,
                  communityResponseId: true,
                  communityResponse: {
                    select: {
                      id: true,
                      isActive: true,
                      creatorAlias: true
                    }
                  },
                  bookmarks: { 
                    select: { 
                      id: true, 
                      title: true 
                    } 
                  } 
                } 
              }
            },
            orderBy: { createdAt: 'desc' }
          });
          // when not forceRefresh, also set createdAt to the createdAt of the latestSummary
          createdAt = latestSummary?.createdAt || null;
          if (latestSummary && latestSummary.responses.length > 0) {
            // console.log(`[generateUserSummary] Found existing summary for user ${userId}, language ${languageId}`);
            
            // Get sharing status for all responses in this batch
            const responseIds = latestSummary.responses.map(r => r.id);
            const sharedResponseIds = await getSharedResponseIds(responseIds);
            
            const transformedResponses = latestSummary.responses.map(response => {
              const { bookmarks, ...rest } = response;
              const isSharedToCommunity = calculateIsSharedToCommunity(response, sharedResponseIds);
              
              return {
                ...rest,
                decks: bookmarks.reduce((acc, bookmark) => {
                  acc[bookmark.id] = bookmark.title;
                  return acc;
                }, {} as Record<string, string>),
                isSharedToCommunity
              };
            });
            allResponses.push(...transformedResponses);
            continue;
          }
        }
        // console.log(`[generateUserSummary] Fetching daily summary bookmark for user ${userId}, language ${languageId}`);
        const dailySummaryBookmark = await prisma.bookmark.findFirst({
          where: { userId, languageId, title: 'daily summary' }
        });
        if (!dailySummaryBookmark) {
          // console.log(`[generateUserSummary] No daily summary bookmark for user ${userId}, language ${languageId}`);
          continue;
        }
        const bookmarkFilter = {
          userId,
          languageId,
          isPaused: false,
          bookmarks: {
            some: {
              AND: [
                { title: { not: 'daily summary' } },
                { title: { not: '' } }
              ]
            }
          }
        };
        const getRandomUserResponses = async (rank: number, take: number) => {
          // console.log(`[generateUserSummary] Fetching responses for user ${userId}, language ${languageId}, rank ${rank}`);
          const query = {
            where: { ...bookmarkFilter, rank: rank },
            select: { id: true, content: true, createdAt: true, rank: true, isPaused: true, furigana: true, isFuriganaEnabled: true, isPhoneticEnabled: true, isKanaEnabled: true, breakdown: true, mobileBreakdown: true, responseType: true, source: true, communityResponseId: true, communityResponse: { select: { id: true, isActive: true, creatorAlias: true } }, bookmarks: { select: { id: true, title: true } } }
          };
          const responses = await prisma.gPTResponse.findMany(query);
          // console.log(`[generateUserSummary] Found ${responses.length} responses for user ${userId}, language ${languageId}, rank ${rank}`);
          
          // Get sharing status for all responses in this batch
          const responseIds = responses.map(r => r.id);
          const sharedResponseIds = await getSharedResponseIds(responseIds);
          
          const transformedResponses = responses.map(response => {
            const { bookmarks, ...rest } = response;
            const isSharedToCommunity = calculateIsSharedToCommunity(response, sharedResponseIds);
            
            return {
              ...rest,
              decks: bookmarks.reduce((acc, bookmark) => {
                acc[bookmark.id] = bookmark.title;
                return acc;
              }, {} as Record<string, string>),
              isSharedToCommunity
            };
          });
          for (let i = transformedResponses.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [transformedResponses[i], transformedResponses[j]] = [transformedResponses[j], transformedResponses[i]];
          }
          return transformedResponses.slice(0, take);
        };
        const rank1Responses = await getRandomUserResponses(1, 4);
        const rank2Responses = await getRandomUserResponses(2, 3);
        const rank3Responses = await getRandomUserResponses(3, 2);
        const languageResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
        // console.log(`[generateUserSummary] Total responses to save for user ${userId}, language ${languageId}: ${languageResponses.length}`);
        if (languageResponses.length > 0) {
          const savedSummary = await prisma.dailySummary.create({
            data: {
              user: { connect: { id: userId } },
              language: { connect: { id: languageId } },
              responses: { connect: languageResponses.map(response => ({ id: response.id })) }
            },
            include: { responses: true }
          });
          // set createdAt to the createdAt of the savedSummary
          createdAt = savedSummary.createdAt;
          // console.log(`[generateUserSummary] Saved new daily summary for user ${userId}, language ${languageId}`);
          
          // Batch bookmark updates to reduce database load
          const BOOKMARK_BATCH_SIZE = 10;
          const responseBatches = [];
          for (let i = 0; i < languageResponses.length; i += BOOKMARK_BATCH_SIZE) {
            responseBatches.push(languageResponses.slice(i, i + BOOKMARK_BATCH_SIZE));
          }
          
          for (const responseBatch of responseBatches) {
            await Promise.all(responseBatch.map(response => 
              prisma.gPTResponse.update({
                where: { id: response.id },
                data: { bookmarks: { connect: { id: dailySummaryBookmark.id } } }
              })
            ));
            
            // Small delay between bookmark batches if there are multiple batches
            if (responseBatches.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          // console.log(`[generateUserSummary] Added daily summary bookmark to responses for user ${userId}, language ${languageId}`);
          allResponses.push(...languageResponses);
        }
      } catch (error) {
        console.error(`[generateUserSummary] Error generating summary for user ${userId}, language ${languageId}:`, error);
      }
    }
    
    // Add a small delay between language batches to prevent database overload
    if (batchIndex < languageBatches.length - 1) {
      console.log(`[generateUserSummary] Waiting 1 second before next language batch for user ${userId}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
    console.log(`[generateUserSummary] Returning ${allResponses.length} responses for user ${userId}`);
    return {allResponses, createdAt};
  } catch (error) {
    console.error(`[generateUserSummary] Error in generateUserSummary for user ${userId}:`, error);
    throw error;
  }
} 