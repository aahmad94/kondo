// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';
import { generateUserSummary } from '../../lib/summaryService';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Main function: fetch users and fan out events
const testFunction = inngest.createFunction(
  { id: "test-function" },
  { event: "test/manual.trigger" },
  async ({ step, event }) => {
    try {
      console.log("[Inngest] Starting daily summary generation (fan-out)...");
      const users = await step.run("fetch-unique-users", async () => {
        const users = await prisma.gPTResponse.findMany({
          select: { userId: true },
          distinct: ['userId'],
          where: {
            userId: { not: '' },
            bookmarks: { some: { title: { not: 'daily summary' } } }
          }
        });
        console.log(`[Inngest] Found ${users.length} users with bookmarked responses`);
        return users;
      });
      // Fan out: send an event for each user
      await step.run("fan-out-user-summaries", async () => {
        await Promise.all(users.map(user =>
          step.sendEvent("generate.user.summary", { 
            name: "generate.user.summary",
            data: { userId: user.userId } })
        ));
      });
      await prisma.$disconnect();
      console.log("[Inngest] Fan-out completed");
      return { success: true, usersProcessed: users.length };
    } catch (error) {
      console.error("[Inngest] Error in fan-out:", error);
      await prisma.$disconnect();
      throw error;
    }
  }
);

// Worker function: process a single user
const generateUserSummaryFunction = inngest.createFunction(
  { id: "generate-user-summary" },
  { event: "generate.user.summary" },
  async ({ event }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Generating summary for user ${userId}`);
      const responses = await generateUserSummary(userId, true, true);
      console.log(`[Inngest] Successfully generated summary for user ${userId} with ${responses?.length || 0} responses`);
      return { success: true, userId, responsesCount: responses?.length || 0 };
    } catch (error) {
      console.error(`[Inngest] Error generating summary for user ${userId}:`, error);
      throw error;
    }
  }
);

// Export the serve handler with our function
export default serve({
  client: inngest,
  functions: [testFunction, generateUserSummaryFunction],
});
