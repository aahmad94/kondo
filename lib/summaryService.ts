import { Bookmark } from '@prisma/client';
import prisma from './prisma';
import { format, toZonedTime } from 'date-fns-tz';

interface Response {
  content: string;
  createdAt: Date;
  rank: number;
  bookmarks: Bookmark[];
}

export async function generateUserSummary(userId: string) {
  const formatDate = (date: Date) => {
    const timeZone = 'America/New_York';
    const zonedDate = toZonedTime(date, timeZone);

    const dateFormatted = format(zonedDate, 'MMMM d, yyyy', { timeZone });
    const timeFormatted = format(zonedDate, 'h:mm a', { timeZone });

    return `${dateFormatted} at ${timeFormatted} EST`;
  };

    // Common where clause for bookmarked responses
    const bookmarkFilter = {
        userId: userId,
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
    const allResponses = await prisma.gPTResponse.findMany({
      where: {
        ...bookmarkFilter,
        rank: rank
      },
      select: {
        bookmarks: true,
        content: true,
        createdAt: true,
        rank: true
      }
    });

    // Shuffle the responses using Fisher-Yates algorithm
    for (let i = allResponses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allResponses[i], allResponses[j]] = [allResponses[j], allResponses[i]];
    }

    // Return only the requested number of responses
    return allResponses.slice(0, take);
  }

  // Fetch random responses for different ranks
  const rank1Responses = await getRandomUserResponses(1, 3);
  const rank2Responses = await getRandomUserResponses(2, 2);
  const rank3Responses = await getRandomUserResponses(3, 1);

  const allResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
  
  if (allResponses.length === 0) {
    return null;
  }

  // Generate the combined content
  const combinedContent = `**Daily Response Summary (${formatDate(new Date())}):**\n\n\n` + 
    allResponses.map((r: Response, index: number) => {
      const divider = "___________________________";
      const number = `${index + 1} of ${allResponses.length}`;
      const dateCreated = `${formatDate(r.createdAt)}`;
      const bookmarkTitles = r.bookmarks.map(b => `"${b.title}"`).join(', ');
      const bookmarks = `${bookmarkTitles}`;
      const rankIcon = r.rank === 1 ? "🔴" : r.rank === 2 ? "🟡" : "🟢";

      return `${divider}\n ${number} ${rankIcon} topic: ${bookmarks}\n ${dateCreated}\n\n\n ${r.content}\n\n`;
    }).join('\n\n');

  return combinedContent;
}

export async function saveDailySummary(userId: string, content: string) {
  // Check if user has "daily summary" bookmark
  let dailySummariesBookmark = await prisma.bookmark.findFirst({
    where: {
      userId: userId,
      title: "daily summary"
    }
  });

  // Create the bookmark if it doesn't exist
  if (!dailySummariesBookmark) {
    dailySummariesBookmark = await prisma.bookmark.create({
      data: {
        title: "daily summary",
        userId: userId
      }
    });
  }

  // Delete all previous summaries for this user
  await prisma.gPTResponse.deleteMany({
    where: {
      userId: userId,
      bookmarks: {
        some: {
          id: dailySummariesBookmark.id
        }
      }
    }
  });

  // Create new GPTResponse entry for this user
  return await prisma.gPTResponse.create({
    data: {
      content: content,
      rank: 1,
      userId: userId,
      createdAt: new Date(),
      bookmarks: {
        connect: {
          id: dailySummariesBookmark.id
        }
      }
    }
  });
} 