import { Inngest } from 'inngest';
import { prisma } from '@/lib/database';
import { sendDojoReportByLanguageCode } from '@/lib/email/emailService';

// Initialize the Inngest client
const inngest = new Inngest({ id: 'Kondo' });

// Dedicated email function: process daily emails for a single user
export const sendDailyEmailsFunction = inngest.createFunction(
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

// Weekly email worker: process weekly emails for a single user
export const sendWeeklyEmailsFunction = inngest.createFunction(
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
