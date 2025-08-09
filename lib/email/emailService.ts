import { Resend } from 'resend';
import { prisma } from '@/lib/database';
import { generateUserSummary } from '@/lib/gpt';

// Lazy initialization of Resend client (server-side only)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  // Prevent client-side execution
  if (typeof window !== 'undefined') {
    throw new Error('Resend client can only be used server-side');
  }
  
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface EmailPreferences {
  isSubscribed: boolean;
  email: string | null;
  frequency: 'daily' | 'weekly' | 'none';
  lastEmailSent: Date | null;
}

export interface SubscriptionData {
  userId: string;
  email: string;
  frequency: 'daily' | 'weekly';
  subscriptionDate: Date;
}

/**
 * Subscribe user to email updates
 */
export async function subscribeUserToEmails(
  userId: string,
  email: string,
  frequency: 'daily' | 'weekly'
): Promise<SubscriptionData> {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscribed: true,
      subscriptionEmail: email,
      emailFrequency: frequency,
      emailSubscribedAt: new Date(),
      unsubscribedAt: null, // Clear any previous unsubscribe
    },
  });

  return {
    userId,
    email,
    frequency,
    subscriptionDate: updatedUser.emailSubscribedAt!,
  };
}

/**
 * Unsubscribe user from email updates
 */
export async function unsubscribeUserFromEmails(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribed: false,
      unsubscribedAt: new Date(),
    },
  });
}

/**
 * Get user email preferences
 */
export async function getUserEmailPreferences(userId: string): Promise<EmailPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscribed: true,
      subscriptionEmail: true,
      email: true,
      emailFrequency: true,
      lastEmailSent: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    isSubscribed: user.subscribed || false,
    email: user.subscriptionEmail || user.email || null,
    frequency: (user.emailFrequency as 'daily' | 'weekly' | 'none') || 'daily',
    lastEmailSent: user.lastEmailSent,
  };
}

/**
 * Update email frequency
 */
export async function updateEmailFrequency(
  userId: string,
  frequency: 'daily' | 'weekly'
): Promise<EmailPreferences> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailFrequency: frequency,
    },
  });

  return getUserEmailPreferences(userId);
}

/**
 * Update user's subscription email address
 */
export async function updateUserEmailAddress(
  userId: string,
  newEmail: string
): Promise<EmailPreferences> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionEmail: newEmail,
    },
  });

  return getUserEmailPreferences(userId);
}

/**
 * Validate email address format
 */
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'Kondo <noreply@kondoai.com>',
      to: [email],
      subject: 'Welcome to Kondo Daily Updates! 🥋',
      html: generateWelcomeEmailHTML(userName),
      text: generateWelcomeEmailText(userName),
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(userId: string, isTest: boolean = false): Promise<void> {
  try {
    // Get user info and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        subscribed: true,
        subscriptionEmail: true,
        email: true,
        emailFrequency: true,
      },
    });

    if (!user || !user.subscribed) {
      throw new Error('User not subscribed to emails');
    }

    const recipientEmail = user.subscriptionEmail || user.email;
    if (!recipientEmail) {
      throw new Error('No email address found for user');
    }

    // Generate daily summary content
    const summaryData = await generateUserSummary(userId, false, false);
    
    if (!summaryData || !summaryData.allResponses || summaryData.allResponses.length === 0) {
      console.log(`No daily content available for user ${userId}`);
      return;
    }

    const emailContent = generateDailyDigestHTML(
      user.name || 'Kondo User',
      summaryData.allResponses.slice(0, 6), // Limit to 6 responses for email
      isTest
    );

    const subject = isTest 
      ? '🧪 Test: Your Daily Kondo Dojo Update' 
      : '🥋 Your Daily Kondo Dojo Update';

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Kondo <noreply@kondoai.com>',
      to: [recipientEmail],
      subject,
      html: emailContent,
      text: generateDailyDigestText(summaryData.allResponses.slice(0, 6)),
    });

    // Update last email sent timestamp (only for real emails, not tests)
    if (!isTest) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastEmailSent: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error sending daily digest:', error);
    throw new Error('Failed to send daily digest');
  }
}

/**
 * Check if user has daily content available
 */
export async function checkUserHasDailyContent(userId: string): Promise<boolean> {
  try {
    const summaryData = await generateUserSummary(userId, false, false);
    return summaryData && summaryData.allResponses && summaryData.allResponses.length > 0;
  } catch (error) {
    console.error('Error checking daily content:', error);
    return false;
  }
}

/**
 * Generate unsubscribe token (simple implementation)
 */
export async function generateUnsubscribeToken(userId: string): Promise<string> {
  // Simple token generation - in production, use proper JWT or encrypted tokens
  const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  return token;
}

/**
 * Validate unsubscribe token
 */
export async function validateUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp] = decoded.split(':');
    
    // Token expires after 30 days
    const tokenAge = Date.now() - parseInt(timestamp);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    if (tokenAge > thirtyDaysInMs) {
      return null;
    }
    
    return userId;
  } catch (error) {
    console.error('Error validating unsubscribe token:', error);
    return null;
  }
}

// Email template functions
function generateWelcomeEmailHTML(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Welcome to Kondo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">🥋 Welcome to Kondo!</h1>
        <p style="color: #666; font-size: 18px;">Your Daily Language Learning Journey Begins</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p>Hi ${userName},</p>
        <p>Thank you for subscribing to Kondo's daily email updates! You'll now receive personalized language learning content from your Dojo directly in your inbox.</p>
        
        <h3 style="color: #2563eb;">What to expect:</h3>
        <ul>
          <li>📚 Daily curated content from your bookmarks</li>
          <li>🎯 Personalized to your learning level</li>
          <li>🌐 Support for multiple languages</li>
          <li>📱 Mobile-friendly format</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://kondoai.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Visit Kondo</a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
        <p>Happy learning!</p>
        <p>The Kondo Team</p>
      </div>
    </body>
    </html>
  `;
}

function generateWelcomeEmailText(userName: string): string {
  return `
🥋 Welcome to Kondo!

Hi ${userName},

Thank you for subscribing to Kondo's daily email updates! You'll now receive personalized language learning content from your Dojo directly in your inbox.

What to expect:
- Daily curated content from your bookmarks
- Personalized to your learning level  
- Support for multiple languages
- Mobile-friendly format

Visit Kondo: https://kondoai.com

Happy learning!
The Kondo Team
  `;
}

function generateDailyDigestHTML(userName: string, responses: any[], isTest: boolean = false): string {
  const testBadge = isTest ? '<div style="background: #fbbf24; color: #92400e; padding: 8px 16px; border-radius: 4px; margin-bottom: 20px; text-align: center; font-weight: 600;">🧪 This is a test email</div>' : '';
  
  const responsesHTML = responses.map((response, index) => `
    <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #2563eb;">
      <div style="font-weight: 600; color: #1e40af; margin-bottom: 8px;">#${index + 1}</div>
      <div style="font-size: 16px; margin-bottom: 8px;">${response.content}</div>
      ${response.breakdown ? `<div style="font-size: 14px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">${response.breakdown}</div>` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Your Daily Kondo Update</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${testBadge}
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">🥋 Your Daily Dojo</h1>
        <p style="color: #666;">Today's language learning content</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p>Hi ${userName},</p>
        <p>Here's your personalized daily content from your Kondo Dojo:</p>
      </div>
      
      ${responsesHTML}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://kondoai.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue Learning on Kondo</a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to Kondo daily updates.</p>
        <p><a href="https://kondoai.com/unsubscribe?token={{unsubscribe_token}}" style="color: #666;">Unsubscribe</a></p>
      </div>
    </body>
    </html>
  `;
}

function generateDailyDigestText(responses: any[]): string {
  const responsesText = responses.map((response, index) => 
    `${index + 1}. ${response.content}\n${response.breakdown ? `   ${response.breakdown}\n` : ''}`
  ).join('\n');

  return `
🥋 Your Daily Kondo Dojo

Today's language learning content:

${responsesText}

Continue learning: https://kondoai.com

---
You're receiving this because you subscribed to Kondo daily updates.
Unsubscribe: https://kondoai.com/unsubscribe?token={{unsubscribe_token}}
  `;
}
