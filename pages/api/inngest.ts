// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';
import { generateUserSummary, saveDailySummary } from '../../lib/summaryService';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a scheduled function to run every evening at 9 PM EST
const dailyResponseLogger = inngest.createFunction(
  { id: "daily-response-logger" },
  { cron: "TZ=America/New_York 1 0 * * *" }, // Run at 12:01 AM EST
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

    // For each user, generate and save their summary
    await step.run("process-user-responses", async () => {
      for (const user of users) {
        const summary = await generateUserSummary(user.userId);
        if (summary) {
          await saveDailySummary(user.userId, summary);
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
