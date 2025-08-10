import { Inngest } from 'inngest';
import { prisma, generateUserSummary } from '@/lib';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Worker function: process a single user summary (no emails)
export const buildDojoReportFunction = inngest.createFunction(
  { id: "build-dojo-report" },
  { event: "generate.user.summary" },
  async ({ event, step }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Generating summary for user ${userId}`);
      
      // Generate summary only - no email logic
      const data = await step.run("generate-summary", async () => {
        return await generateUserSummary(userId, true, true);
      });
      
      const { allResponses: responses, createdAt } = data;
      console.log(`[Inngest] Successfully generated summary for user ${userId} with ${responses?.length || 0} responses`);
      
      return { success: true, userId, responsesCount: responses?.length || 0 };
    } catch (error) {
      console.error(`[Inngest] Error processing user ${userId}:`, error);
      throw error;
    }
  }
);
