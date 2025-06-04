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
    console.log(`[generateUserSummary] Start for user ${userId}, forceRefresh=${forceRefresh}, allLanguages=${allLanguages}`);
    let languageIds: string[] = [];
    
    if (allLanguages) {
      console.log(`[generateUserSummary] Fetching all active languages for user ${userId}`);
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
      console.log(`[generateUserSummary] Found ${activeLanguages.length} active languages for user ${userId}`);
      languageIds = activeLanguages.map(lang => lang.id);
    } else {
      console.log(`[generateUserSummary] Fetching language preference for user ${userId}`);
      const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });
      console.log(`[generateUserSummary] User language preference: ${userLanguagePreference?.languageId}`);
      const defaultLanguageId = (await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      }))?.id;
      console.log(`[generateUserSummary] Default language id: ${defaultLanguageId}`);
      languageIds = [userLanguagePreference?.languageId || defaultLanguageId].filter(Boolean) as string[];
    }
    console.log(`[generateUserSummary] languageIds for user ${userId}:`, languageIds);
    if (languageIds.length === 0) {
      console.error(`[generateUserSummary] No languages found for user ${userId}`);
      throw new Error('No languages found');
    }
    const allResponses: Response[] = [];
    let createdAt: Date | null = null;
    for (const languageId of languageIds) {
      try {
        console.log(`[generateUserSummary] Processing language ${languageId} for user ${userId}`);
        if (!forceRefresh) {
          console.log(`[generateUserSummary] Checking for existing summary for user ${userId}, language ${languageId}`);
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
            console.log(`[generateUserSummary] Found existing summary for user ${userId}, language ${languageId}`);
            const transformedResponses = latestSummary.responses.map(response => ({
              ...response,
              bookmarks: response.bookmarks.reduce((acc, bookmark) => {
                acc[bookmark.id] = bookmark.title;
                return acc;
              }, {} as Record<string, string>)
            }));
            allResponses.push(...transformedResponses);
            continue;
          }
        }
        console.log(`[generateUserSummary] Fetching daily summary bookmark for user ${userId}, language ${languageId}`);
        const dailySummaryBookmark = await prisma.bookmark.findFirst({
          where: { userId, languageId, title: 'daily summary' }
        });
        if (!dailySummaryBookmark) {
          console.log(`[generateUserSummary] No daily summary bookmark for user ${userId}, language ${languageId}`);
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
          console.log(`[generateUserSummary] Fetching responses for user ${userId}, language ${languageId}, rank ${rank}`);
          const query = {
            where: { ...bookmarkFilter, rank: rank },
            select: { id: true, content: true, createdAt: true, rank: true, isPaused: true, furigana: true, isFuriganaEnabled: true, bookmarks: { select: { id: true, title: true } } }
          };
          const responses = await prisma.gPTResponse.findMany(query);
          console.log(`[generateUserSummary] Found ${responses.length} responses for user ${userId}, language ${languageId}, rank ${rank}`);
          const transformedResponses = responses.map(response => ({
            ...response,
            bookmarks: response.bookmarks.reduce((acc, bookmark) => {
              acc[bookmark.id] = bookmark.title;
              return acc;
            }, {} as Record<string, string>)
          }));
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
        console.log(`[generateUserSummary] Total responses to save for user ${userId}, language ${languageId}: ${languageResponses.length}`);
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
          console.log(`[generateUserSummary] Saved new daily summary for user ${userId}, language ${languageId}`);
          await Promise.all(languageResponses.map(response => 
            prisma.gPTResponse.update({
              where: { id: response.id },
              data: { bookmarks: { connect: { id: dailySummaryBookmark.id } } }
            })
          ));
          console.log(`[generateUserSummary] Added daily summary bookmark to responses for user ${userId}, language ${languageId}`);
          allResponses.push(...languageResponses);
        }
      } catch (error) {
        console.error(`[generateUserSummary] Error generating summary for user ${userId}, language ${languageId}:`, error);
      }
    }
    console.log(`[generateUserSummary] Returning ${allResponses.length} responses for user ${userId}`);
    return {allResponses, createdAt};
  } catch (error) {
    console.error(`[generateUserSummary] Error in generateUserSummary for user ${userId}:`, error);
    throw error;
  }
} 