import { Inngest } from 'inngest';
import { prisma, generateUserSummary } from '@/lib';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Retry function for failed summary generations
export const retryFailedSummaryFunction = inngest.createFunction(
  { id: "retry-failed-summary" },
  { event: "retry.summary.generation" },
  async ({ event, step }) => {
    const { userId, attemptNumber = 1 } = event.data;
    const MAX_RETRIES = 3;
    
    if (attemptNumber > MAX_RETRIES) {
      console.log(`[Inngest] Max retries (${MAX_RETRIES}) exceeded for user ${userId}`);
      return { success: false, userId, reason: 'max_retries_exceeded' };
    }
    
    try {
      console.log(`[Inngest] Retry attempt ${attemptNumber}/${MAX_RETRIES} for user ${userId}`);
      
      // Wait a bit before retrying (exponential backoff)
      const delayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000); // Max 10 seconds
      await step.sleep("retry-delay", delayMs);
      
      // Attempt summary generation with shorter timeout for retries
      const data = await step.run("retry-generate-summary", async () => {
        const summaryPromise = generateUserSummary(userId, true, true);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Retry timeout')), 8000) // Shorter timeout for retries
        );
        
        return await Promise.race([summaryPromise, timeoutPromise]);
      });
      
      const { allResponses: responses } = data as { allResponses: any[]; createdAt: Date | null };
      console.log(`[Inngest] Retry successful for user ${userId} with ${responses?.length || 0} responses`);
      
      await prisma.$disconnect();
      return { success: true, userId, attemptNumber, responsesCount: responses?.length || 0 };
      
    } catch (error) {
      console.error(`[Inngest] Retry attempt ${attemptNumber} failed for user ${userId}:`, error);
      await prisma.$disconnect();
      
      // Schedule next retry if we haven't exceeded max attempts
      if (attemptNumber < MAX_RETRIES) {
        await step.sendEvent("retry.summary.generation", {
          name: "retry.summary.generation",
          data: { userId, attemptNumber: attemptNumber + 1 }
        });
        
        return { success: false, userId, attemptNumber, willRetry: true };
      } else {
        return { success: false, userId, attemptNumber, error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
);
