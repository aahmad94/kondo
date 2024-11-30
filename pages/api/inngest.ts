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
    // First, get all unique users who have responses
    const users = await step.run("fetch-unique-users", async () => {
      return await prisma.gPTResponse.findMany({
        select: {
          userId: true,
        },
        distinct: ['userId'],
        where: {
          userId: {
            not: ''
          }
        }
      });
    });

    // For each user, fetch and aggregate their responses
    await step.run("process-user-responses", async () => {
      for (const user of users) {
        // Fetch 10 random responses for this user
        const userResponses = await prisma.gPTResponse.findMany({
          where: {
            userId: user.userId
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            content: true,
            createdAt: true
          }
        });

        if (userResponses.length > 0) {
          const date = new Date().toISOString().split('T')[0];
          const combinedContent = `Daily Response Summary for User (${date}):\n\n` + 
            userResponses.map((r: { content: string; createdAt: Date }, index: number) =>
              `${index + 1}. ${r.content} (Created At: ${new Date(r.createdAt).toISOString()})`).join('\n\n');
          
          // Create new GPTResponse entry for this user
          await prisma.gPTResponse.create({
            data: {
              content: combinedContent,
              rank: 1,
              userId: user.userId,
              createdAt: new Date()
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
