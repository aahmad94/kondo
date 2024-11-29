// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import prisma from '../../lib/prisma';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Create a scheduled function to run every evening at 9 PM EST
const dailyResponseLogger = inngest.createFunction(
  { id: "daily-response-logger" },
  { cron: "0 21 * * * America/New_York" }, // Run at 9 PM EST
  async ({ step }) => {
    // Fetch 10 random GPT responses
    const responses = await step.run("fetch-random-responses", async () => {
      return await prisma.gPTResponse.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          content: true,
          userId: true,
          createdAt: true
        }
      });
    });

    // Combine responses into a single entry
    await step.run("create-combined-response", async () => {
      const date = new Date().toISOString().split('T')[0];
      const combinedContent = `Daily Response Summary (${date}):\n\n` + 
        responses.map((r: { content: string; createdAt: string }, index: number) =>
           `${index + 1}. ${r.content} (Created At: ${new Date(r.createdAt).toISOString()})`).join('\n\n');
      
      // Create new GPTResponse entry
      await prisma.gPTResponse.create({
        data: {
          content: combinedContent,
          rank: 1,
          userId: responses[0]?.userId || '', // Use the userId from the first response
          createdAt: new Date()
        }
      });
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
