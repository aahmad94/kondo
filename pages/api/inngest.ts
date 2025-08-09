// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import { prisma, generateUserSummary } from '@/lib';
import { sendAllLanguageDigests } from '@/lib/email';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Main function: fetch users and fan out events
const testFunction = inngest.createFunction(
  { id: "daily-response-logger" },
  { cron: "TZ=America/New_York 1 0 * * *" },
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
      // Fan out: send an event for each user (not inside step.run)
      await Promise.all(users.map(user =>
        step.sendEvent("generate.user.summary", { 
          name: "generate.user.summary", 
          data: { userId: user.userId }
        })
      ));
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
  async ({ event, step }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Generating summary for user ${userId}`);
      
      // Step 1: Generate summary
      const data = await step.run("generate-summary", async () => {
        return await generateUserSummary(userId, true, true);
      });
      
      const { allResponses: responses, createdAt } = data;
      console.log(`[Inngest] Successfully generated summary for user ${userId} with ${responses?.length || 0} responses`);
      
      // Step 2: Send emails if user has content and subscriptions
      if (responses && responses.length > 0) {
        await step.run("send-daily-emails", async () => {
          try {
            console.log(`[Inngest] Checking email subscriptions for user ${userId}`);
            
            // Get user's language subscriptions
            const subscriptions = await prisma.userLanguageSubscription.findMany({
              where: {
                userId,
                subscribed: true,
                emailFrequency: 'daily' // Only send daily emails in this job
              },
              include: {
                language: true,
                user: {
                  select: { name: true, email: true }
                }
              }
            });
            
            if (subscriptions.length > 0) {
              console.log(`[Inngest] Found ${subscriptions.length} daily email subscriptions for user ${userId}`);
              await sendAllLanguageDigests(userId, false);
              console.log(`[Inngest] Successfully sent daily emails for user ${userId}`);
              return { emailsSent: subscriptions.length };
            } else {
              console.log(`[Inngest] No daily email subscriptions found for user ${userId}`);
              return { emailsSent: 0 };
            }
          } catch (emailError) {
            console.error(`[Inngest] Error sending emails for user ${userId}:`, emailError);
            // Don't throw - we don't want email failures to break summary generation
            return { emailsSent: 0, emailError: emailError instanceof Error ? emailError.message : String(emailError) };
          }
        });
      } else {
        console.log(`[Inngest] No content available for user ${userId}, skipping emails`);
      }
      
      return { success: true, userId, responsesCount: responses?.length || 0 };
    } catch (error) {
      console.error(`[Inngest] Error processing user ${userId}:`, error);
      throw error;
    }
  }
);

// Weekly email function: runs every Sunday at 1:00 AM EST
const weeklyEmailFunction = inngest.createFunction(
  { id: "weekly-email-digest" },
  { cron: "TZ=America/New_York 1 0 * * 0" }, // Sunday at 1:00 AM EST
  async ({ step }) => {
    try {
      console.log("[Inngest] Starting weekly email digest...");
      
      // Get all users with weekly email subscriptions
      const weeklySubscriptions = await step.run("fetch-weekly-subscribers", async () => {
        const subscriptions = await prisma.userLanguageSubscription.findMany({
          where: {
            subscribed: true,
            emailFrequency: 'weekly'
          },
          select: { userId: true },
          distinct: ['userId']
        });
        console.log(`[Inngest] Found ${subscriptions.length} users with weekly subscriptions`);
        return subscriptions;
      });
      
      // Fan out weekly email events
      await Promise.all(weeklySubscriptions.map(subscription =>
        step.sendEvent("send.weekly.emails", { 
          name: "send.weekly.emails", 
          data: { userId: subscription.userId }
        })
      ));
      
      console.log("[Inngest] Weekly email fan-out completed");
      return { success: true, usersProcessed: weeklySubscriptions.length };
    } catch (error) {
      console.error("[Inngest] Error in weekly email fan-out:", error);
      throw error;
    }
  }
);

// Weekly email worker: process weekly emails for a single user
const sendWeeklyEmailsFunction = inngest.createFunction(
  { id: "send-weekly-emails" },
  { event: "send.weekly.emails" },
  async ({ event }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Sending weekly emails for user ${userId}`);
      
      // Check if user has responses to send
      const summaryData = await generateUserSummary(userId, false, false);
      
      if (summaryData && summaryData.allResponses && summaryData.allResponses.length > 0) {
        await sendAllLanguageDigests(userId, false);
        console.log(`[Inngest] Successfully sent weekly emails for user ${userId}`);
        return { success: true, userId };
      } else {
        console.log(`[Inngest] No content available for weekly email for user ${userId}`);
        return { success: true, userId, skipped: true };
      }
    } catch (error) {
      console.error(`[Inngest] Error sending weekly emails for user ${userId}:`, error);
      throw error;
    }
  }
);

// Export the serve handler with our functions
export default serve({
  client: inngest,
  functions: [
    testFunction, 
    generateUserSummaryFunction,
    weeklyEmailFunction,
    sendWeeklyEmailsFunction
  ],
});
