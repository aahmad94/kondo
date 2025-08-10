// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import { prisma, generateUserSummary, getUserSummary } from '@/lib';
import { sendAllLanguageDigests } from '@/lib/email';
import { sendDojoReportByLanguageCode } from '@/lib/email/emailService';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Main function: fetch users and fan out summary generation events
const initDojoFanOutFunction = inngest.createFunction(
  { id: "init-dojo-fan-out" },
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
      
      // Fan out summary generation events
      await Promise.all(users.map(user =>
        step.sendEvent("generate.user.summary", { 
          name: "generate.user.summary", 
          data: { userId: user.userId }
        })
      ));
      
      await prisma.$disconnect();
      console.log("[Inngest] Summary generation fan-out completed");
      return { success: true, usersProcessed: users.length };
    } catch (error) {
      console.error("[Inngest] Error in summary generation fan-out:", error);
      await prisma.$disconnect();
      throw error;
    }
  }
);

// Email trigger function: runs 30 minutes after summary generation
const dailyEmailTriggerFunction = inngest.createFunction(
  { id: "daily-email-trigger" },
  { cron: "TZ=America/New_York 30 1 * * *" }, // 1:30 AM EST - 30 minutes after summaries
  async ({ step, event }) => {
    try {
      console.log("[Inngest] Starting daily email trigger (fan-out)...");
      
      // Get all users with daily email subscriptions
      const users = await step.run("fetch-email-subscribers", async () => {
        const subscriptions = await prisma.userLanguageSubscription.findMany({
          where: {
            subscribed: true,
            emailFrequency: 'daily'
          },
          select: { userId: true },
          distinct: ['userId']
        });
        console.log(`[Inngest] Found ${subscriptions.length} users with daily email subscriptions`);
        return subscriptions;
      });
      
      // Fan out email events
      await Promise.all(users.map(user =>
        step.sendEvent("send.daily.emails", { 
          name: "send.daily.emails", 
          data: { userId: user.userId }
        })
      ));
      
      console.log("[Inngest] Daily email fan-out completed");
      return { success: true, usersProcessed: users.length };
    } catch (error) {
      console.error("[Inngest] Error in daily email fan-out:", error);
      throw error;
    }
  }
);

// Worker function: process a single user summary (no emails)
const buildDojoReportFunction = inngest.createFunction(
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

// Dedicated email function: process daily emails for a single user
const sendDailyEmailsFunction = inngest.createFunction(
  { id: "send-daily-emails" },
  { event: "send.daily.emails" },
  async ({ event, step }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Processing daily emails for user ${userId}`);
      
      // Check if user has email subscriptions
      const subscriptions = await step.run("check-subscriptions", async () => {
        const subs = await prisma.userLanguageSubscription.findMany({
          where: {
            userId,
            subscribed: true,
            emailFrequency: 'daily'
          },
          include: {
            language: {
              select: { code: true, name: true, id: true }
            },
            user: {
              select: { name: true, email: true }
            }
          }
        });
        console.log(`[Inngest] Found ${subs.length} daily email subscriptions for user ${userId}`);
        return subs;
      });
      
      if (subscriptions.length === 0) {
        console.log(`[Inngest] No daily email subscriptions found for user ${userId}`);
        return { success: true, userId, emailsSent: 0 };
      }
      
      // Send emails for each daily subscription
      const emailResult = await step.run("send-emails", async () => {
        try {
          let emailsSent = 0;
          
          for (const subscription of subscriptions) {
            try {
              await sendDojoReportByLanguageCode(userId, subscription.language.code, false);
              emailsSent++;
              console.log(`[Inngest] Sent daily email for user ${userId}, language ${subscription.language.name} (${subscription.language.code})`);
            } catch (langError) {
              console.error(`[Inngest] Error sending email for user ${userId}, language ${subscription.language.name} (${subscription.language.code}):`, langError);
              // Continue with other languages even if one fails
            }
          }
          
          console.log(`[Inngest] Successfully sent ${emailsSent} daily emails for user ${userId}`);
          return { emailsSent };
        } catch (emailError) {
          console.error(`[Inngest] Error sending emails for user ${userId}:`, emailError);
          throw emailError;
        }
      });
      
      return { success: true, userId, ...emailResult };
    } catch (error) {
      console.error(`[Inngest] Error processing daily emails for user ${userId}:`, error);
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
  async ({ event, step }) => {
    const { userId } = event.data;
    try {
      console.log(`[Inngest] Processing weekly emails for user ${userId}`);
      
      // Check if user has weekly email subscriptions
      const subscriptions = await step.run("check-weekly-subscriptions", async () => {
        const subs = await prisma.userLanguageSubscription.findMany({
          where: {
            userId,
            subscribed: true,
            emailFrequency: 'weekly'
          },
          include: {
            language: {
              select: { code: true, name: true, id: true }
            },
            user: {
              select: { name: true, email: true }
            }
          }
        });
        console.log(`[Inngest] Found ${subs.length} weekly email subscriptions for user ${userId}`);
        return subs;
      });
      
      if (subscriptions.length === 0) {
        console.log(`[Inngest] No weekly email subscriptions found for user ${userId}`);
        return { success: true, userId, emailsSent: 0 };
      }
      
      // Send emails for each weekly subscription
      const emailResult = await step.run("send-weekly-emails", async () => {
        try {
          let emailsSent = 0;
          
          for (const subscription of subscriptions) {
            try {
              await sendDojoReportByLanguageCode(userId, subscription.language.code, false);
              emailsSent++;
              console.log(`[Inngest] Sent weekly email for user ${userId}, language ${subscription.language.name} (${subscription.language.code})`);
            } catch (langError) {
              console.error(`[Inngest] Error sending weekly email for user ${userId}, language ${subscription.language.name} (${subscription.language.code}):`, langError);
              // Continue with other languages even if one fails
            }
          }
          
          console.log(`[Inngest] Successfully sent ${emailsSent} weekly emails for user ${userId}`);
          return { emailsSent };
        } catch (emailError) {
          console.error(`[Inngest] Error sending weekly emails for user ${userId}:`, emailError);
          throw emailError;
        }
      });
      
      return { success: true, userId, ...emailResult };
    } catch (error) {
      console.error(`[Inngest] Error processing weekly emails for user ${userId}:`, error);
      throw error;
    }
  }
);

// Export the serve handler with our functions
export default serve({
  client: inngest,
  functions: [
    initDojoFanOutFunction,
    dailyEmailTriggerFunction,
    buildDojoReportFunction,
    sendDailyEmailsFunction,
    weeklyEmailFunction,
    sendWeeklyEmailsFunction
  ],
});
