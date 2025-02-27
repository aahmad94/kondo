// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';
import { generateUserSummary } from '../../lib/summaryService';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a scheduled function to run every evening at 9 PM EST
const dailyResponseLogger = inngest.createFunction(
  { id: "daily-response-logger" },
  { cron: "TZ=America/New_York 1 0 * * *" },
  async ({ step }) => {
    try {
      console.log("[Inngest] Starting daily summary generation...");
      
      // First, get all unique users who have bookmarked responses
      const users = await step.run("fetch-unique-users", async () => {
        const users = await prisma.gPTResponse.findMany({
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
                  not: 'daily summary'
                }
              }
            }
          }
        });
        console.log(`[Inngest] Found ${users.length} users with bookmarked responses`);
        return users;
      });

      // For each user, generate summary directly
      await step.run("process-user-responses", async () => {
        console.log(`[Inngest] Processing ${users.length} users for summary generation`);
        for (const user of users) {
          try {
            console.log(`[Inngest] Generating summary for user ${user.userId}`);
            const responses = await generateUserSummary(user.userId, true, true);
            console.log(`[Inngest] Successfully generated summary for user ${user.userId} with ${responses?.length || 0} responses`);
          } catch (error) {
            console.error(`[Inngest] Error generating summary for user ${user.userId}:`, error);
            // Continue with next user even if one fails
          }
        }
      });

      await prisma.$disconnect();
      console.log("[Inngest] Daily summary generation completed successfully");
      return { success: true, usersProcessed: users.length };
    } catch (error) {
      console.error("[Inngest] Error in daily summary generation:", error);
      await prisma.$disconnect();
      throw error; // Re-throw to mark the function as failed in Inngest
    }
  }
);

// Export the serve handler with our function
export default serve({
  client: inngest,
  functions: [dailyResponseLogger],
});
