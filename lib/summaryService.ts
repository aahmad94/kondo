import prisma from './prisma';

interface Response {
  content: string;
  createdAt: Date;
  rank: number;
}

export async function generateUserSummary(userId: string) {
  // Common where clause for bookmarked responses
  const bookmarkFilter = {
    userId: userId,
    bookmarks: {
      some: {
        title: {
          not: 'daily summaries'
        }
      }
    }
  };

  const formatDate = (date: Date) => {
    // Convert the date to NY timezone
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    const dateFormatted = nyDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York'
    });
    
    const timeFormatted = nyDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });
    
    return `${dateFormatted} at ${timeFormatted} EST`;
  };

  // Helper function to fetch random responses for a given rank and take
  const getRandomUserResponses = async (rank: number, take: number) => {
    const allResponses = await prisma.gPTResponse.findMany({
      where: {
        ...bookmarkFilter,
        rank: rank
      },
      select: {
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
  const rank1Responses = await getRandomUserResponses(1, 4);
  const rank2Responses = await getRandomUserResponses(2, 2);
  const rank3Responses = await getRandomUserResponses(3, 1);

  const allResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
  
  if (allResponses.length === 0) {
    return null;
  }

  // Generate the combined content
  const combinedContent = `**Daily Response Summary (${formatDate(new Date())}):**\n\n\n` + 
    allResponses.map((r: Response, index: number) => {
      const number = `**${index + 1} of ${allResponses.length}**\n`;
      const dateCreated = `From: ${formatDate(r.createdAt)}\n`
      const rankIcon = r.rank === 1 ? "hard 🔴" : r.rank === 2 ? "medium 🟡" : "easy 🟢";
      const rank = `**rank: ${rankIcon}**\n`;

      return `${number} ${dateCreated} ${rank} ${r.content}\n\n`;
    }).join('\n\n');

  return combinedContent;
}

export async function saveDailySummary(userId: string, content: string) {
  // Check if user has "daily summaries" bookmark
  let dailySummariesBookmark = await prisma.bookmark.findFirst({
    where: {
      userId: userId,
      title: "daily summaries"
    }
  });

  // Create the bookmark if it doesn't exist
  if (!dailySummariesBookmark) {
    dailySummariesBookmark = await prisma.bookmark.create({
      data: {
        title: "daily summaries",
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