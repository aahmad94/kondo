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
      
      // Add timeout protection and better error handling
      const data = await step.run("generate-summary", async () => {
        try {
          // Set a reasonable timeout for summary generation
          const summaryPromise = generateUserSummary(userId, true, true);
          
          // Create a timeout promise (13 seconds to leave buffer for Vercel's 15s limit)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Summary generation timeout')), 13000)
          );
          
          // Race between summary generation and timeout
          return await Promise.race([summaryPromise, timeoutPromise]);
        } catch (summaryError) {
          console.error(`[Inngest] Summary generation failed for user ${userId}:`, summaryError);
          
          // If summary generation fails, try to disconnect Prisma cleanly
          try {
            await prisma.$disconnect();
          } catch (disconnectError) {
            console.error(`[Inngest] Error disconnecting Prisma for user ${userId}:`, disconnectError);
          }
          
          throw summaryError;
        }
      });
      
      const { allResponses: responses, createdAt } = data as { allResponses: any[]; createdAt: Date | null };
      console.log(`[Inngest] Successfully generated summary for user ${userId} with ${responses?.length || 0} responses`);
      
      // Ensure clean Prisma disconnection
      await step.run("cleanup-connections", async () => {
        await prisma.$disconnect();
        return { disconnected: true };
      });
      
      return { success: true, userId, responsesCount: responses?.length || 0 };
    } catch (error) {
      console.error(`[Inngest] Error processing user ${userId}:`, error);
      
      // Ensure Prisma is disconnected even on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error(`[Inngest] Error in final disconnect for user ${userId}:`, disconnectError);
      }
      
      // Don't throw - log error and schedule retry instead
      await step.sendEvent("retry.summary.generation", {
        name: "retry.summary.generation",
        data: { userId, attemptNumber: 1 }
      });
      
      return { success: false, userId, error: error instanceof Error ? error.message : String(error), willRetry: true };
    }
  }
);
