// pages/api/inngest.ts
import { serve } from "inngest/next";
import { Inngest } from 'inngest';
import { prisma } from '@/lib';
import { 
  sendDailyEmailsFunction, 
  sendWeeklyEmailsFunction, 
  buildDojoReportFunction 
} from '@/lib/inngest';

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
      const userSubscriptions = await step.run("fetch-email-subscribers", async () => {
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
      await Promise.all(userSubscriptions.map(subscription =>
        step.sendEvent("send.daily.emails", { 
          name: "send.daily.emails", 
          data: { userId: subscription.userId }
        })
      ));
      
      console.log("[Inngest] Daily email fan-out completed");
      return { success: true, usersProcessed: userSubscriptions.length };
    } catch (error) {
      console.error("[Inngest] Error in daily email fan-out:", error);
      throw error;
    }
  }
);



// Weekly email trigger function: runs every Sunday at 1:00 AM EST
const weeklyEmailTriggerFunction = inngest.createFunction(
  { id: "weekly-email-trigger" },
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



// Export the serve handler with our functions
export default serve({
  client: inngest,
  functions: [
    // Trigger functions (defined here)
    initDojoFanOutFunction,
    dailyEmailTriggerFunction,
    weeklyEmailTriggerFunction,
    
    // Worker functions (imported from lib/inngest)
    buildDojoReportFunction,
    sendDailyEmailsFunction,
    sendWeeklyEmailsFunction
  ],
});
