// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a function that can be manually triggered
const dailyResponseLogger = inngest.createFunction(
  { id: "daily-response-logger" },
  { event: "daily.summary.generate" },  // This makes it manually triggerable
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

      // For each user, call the getDailySummary endpoint
      await step.run("process-user-responses", async () => {
        console.log(`[Inngest] Processing ${users.length} users for summary generation`);
        for (const user of users) {
          try {
            console.log(`[Inngest] Generating summary for user ${user.userId}`);
            
            // Call the getDailySummary endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/getDailySummary?userId=${user.userId}&forceRefresh=true&allLanguages=true`);
            
            if (!response.ok) {
              throw new Error(`Failed to generate summary: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[Inngest] Successfully generated summary for user ${user.userId} with ${data.responses.length} responses`);
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
