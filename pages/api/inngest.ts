// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a scheduled function to run every evening at 9 PM EST
const dailyResponseLogger = inngest.createFunction(
  { id: "daily-response-logger" },
  { cron: "TZ=America/New_York 0 21 * * *" }, // Run at 9:00 PM EST
  async ({ step }) => {
    // First, get all unique users who have bookmarked responses
    const users = await step.run("fetch-unique-users", async () => {
      return await prisma.gPTResponse.findMany({
        select: {
          userId: true,
        },
        distinct: ['userId'],
        where: {
          userId: {
            not: ''
          },
          bookmarks: {
            some: {
              title: {
                not: 'daily summaries'
              }
            }
          }
        }
      });
    });

    // For each user, fetch and aggregate their responses
    await step.run("process-user-responses", async () => {
      for (const user of users) {
        // Common where clause for bookmarked responses
        const bookmarkFilter = {
          userId: user.userId,
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

        // Helper function to fetch responses for a given rank and take
        const getUserResponses = async (rank: number, take: number) => {
          return await prisma.gPTResponse.findMany({
            where: {
              ...bookmarkFilter,
              rank: rank
            },
            take: take,
            orderBy: {
              createdAt: 'desc'
            },
            select: {
              content: true,
              createdAt: true,
              rank: true
            }
          });
        }

        // Fetch responses for rank 1 (4 responses)
        const rank1Responses = await getUserResponses(1, 4);

        // Fetch responses for rank 2 (2 responses)
        const rank2Responses = await getUserResponses(2, 2);

        // Fetch responses for rank 3 (1 response)
        const rank3Responses = await getUserResponses(3, 1);

        const allResponses = [...rank1Responses, ...rank2Responses, ...rank3Responses];
        
        if (allResponses.length > 0) {
          const combinedContent = `**Daily Response Summary (${formatDate(new Date())}):**\n\n` + 
            allResponses.map((r, index: number) => {
              const number = `**${index + 1} of ${allResponses.length}**\n`;
              const dateCreated = `Created: ${formatDate(r.createdAt)}\n`
              const rankIcon = r.rank === 1 ? "🔴" : r.rank === 2 ? "🟡" : "🟢";
              const rank = `**rank: ${rankIcon}**\n`;

              return `${number} ${dateCreated} ${rank} ${r.content}`
            }).join('\n\n');
          
          // Check if user has "daily summaries" bookmark
          let dailySummariesBookmark = await prisma.bookmark.findFirst({
            where: {
              userId: user.userId,
              title: "daily summaries"
            }
          });

          // Create the bookmark if it doesn't exist
          if (!dailySummariesBookmark) {
            dailySummariesBookmark = await prisma.bookmark.create({
              data: {
                title: "daily summaries",
                userId: user.userId
              }
            });
          }

          // Create new GPTResponse entry for this user
          const newResponse = await prisma.gPTResponse.create({
            data: {
              content: combinedContent,
              rank: 1,
              userId: user.userId,
              createdAt: new Date(),
              bookmarks: {
                connect: {
                  id: dailySummariesBookmark.id
                }
              }
            }
          });
        }
      }
    });

    await prisma.$disconnect();
    return { success: true };
  }
);

// Export the serve handler with our function
export default serve({
  client: inngest,
  functions: [dailyResponseLogger],
});
