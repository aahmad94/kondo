import { Resend } from 'resend';
import { prisma } from '@/lib/database';
import { generateUserSummary } from '@/lib/gpt';
import { formatResponseHTML, formatResponseText, type EmailResponse, type EmailFormatOptions } from './format';

// Lazy initialization of Resend client (server-side only)
let resendClient: Resend | null = null;

// Helper function to get user's language code for email formatting
async function getUserLanguageCode(userId: string): Promise<string> {
  try {
    const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      include: {
        language: true
      }
    });

    return userLanguagePreference?.language?.code || 'ja'; // Default to Japanese
  } catch (error) {
    console.error('Error getting user language code:', error);
    return 'ja'; // Default fallback
  }
}

// Helper function to get language flag emoji
function getLanguageFlag(languageCode: string): string {
  const flags: Record<string, string> = {
    'ja': '🇯🇵',
    'es': '🇪🇸', 
    'zh': '🇨🇳',
    'ko': '🇰🇷',
    'ar': '🇸🇦'
  };
  return flags[languageCode] || '🌐';
}

// Helper function to get all active language subscriptions for a user
async function getUserLanguageSubscriptions(userId: string) {
  try {
    return await prisma.userLanguageSubscription.findMany({
      where: {
        userId,
        subscribed: true,
        emailFrequency: {
          not: 'none'
        }
      },
      include: {
        language: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting user language subscriptions:', error);
    return [];
  }
}

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
 * Send daily digest email (legacy - uses current user language)
 */
export async function sendDailyDigest(userId: string, isTest: boolean = false): Promise<void> {
  try {
    // Get user info and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
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

    const emailContent = await generateDailyDigestHTML(
      user.name || 'Kondo User',
      summaryData.allResponses.slice(0, 6), // Show 6 responses since Gmail truncation persists anyway
      user.id,
      isTest
    );

    const currentDate = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const userLanguageCode = await getUserLanguageCode(userId);
    const languageFlag = getLanguageFlag(userLanguageCode);
    
    const subject = isTest 
      ? `${languageFlag} Test: ${currentDate} Dojo Report` 
      : `${languageFlag} ${currentDate} Dojo Report`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Kondo <noreply@kondoai.com>',
      to: [recipientEmail],
      subject,
      html: emailContent,
      text: await generateDailyDigestText(summaryData.allResponses.slice(0, 6), user.id),
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
 * Send language-specific daily digest email
 */
export async function sendLanguageSpecificDailyDigest(userId: string, languageId: string, isTest: boolean = false): Promise<void> {
  try {
    // Get the specific language subscription
    const subscription = await prisma.userLanguageSubscription.findUnique({
      where: {
        userId_languageId: { userId, languageId }
      },
      include: {
        language: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!subscription || !subscription.subscribed) {
      throw new Error('User not subscribed to emails for this language');
    }

    const recipientEmail = subscription.subscriptionEmail || subscription.user.email;
    if (!recipientEmail) {
      throw new Error('No email address found for user subscription');
    }

    // Generate daily summary content and filter by language
    const allSummaryData = await generateUserSummary(userId, false, true); // Get all languages
    
    if (!allSummaryData || !allSummaryData.allResponses || allSummaryData.allResponses.length === 0) {
      console.log(`No daily content available for user ${userId}`);
      return;
    }

    // Filter responses for this specific language
    const languageResponses = await prisma.gPTResponse.findMany({
      where: {
        userId,
        languageId,
        id: {
          in: allSummaryData.allResponses.map(r => r.id)
        }
      },
      select: {
        id: true,
        content: true,
        rank: true,
        breakdown: true,
        languageId: true
      }
    });

    if (languageResponses.length === 0) {
      console.log(`No daily content available for user ${userId} in language ${languageId}`);
      return;
    }

    // Create filtered summary data
    const summaryData = {
      ...allSummaryData,
      allResponses: languageResponses
    };

    const emailContent = await generateDailyDigestHTML(
      subscription.user.name || 'Kondo User',
      summaryData.allResponses.slice(0, 6),
      userId,
      isTest
    );

    const currentDate = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const languageFlag = getLanguageFlag(subscription.language.code);
    
    const subject = isTest 
      ? `${languageFlag} Test: ${currentDate} Dojo Report` 
      : `${languageFlag} ${currentDate} Dojo Report`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Kondo <noreply@kondoai.com>',
      to: [recipientEmail],
      subject,
      html: emailContent,
      text: await generateDailyDigestText(summaryData.allResponses.slice(0, 6), userId),
    });

    // Update last email sent timestamp (only for real emails, not tests)
    if (!isTest) {
      await prisma.userLanguageSubscription.update({
        where: {
          userId_languageId: { userId, languageId }
        },
        data: {
          lastEmailSent: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error sending language-specific daily digest:', error);
    throw new Error('Failed to send language-specific daily digest');
  }
}

/**
 * Send daily digests for all of a user's language subscriptions
 */
export async function sendAllLanguageDigests(userId: string, isTest: boolean = false): Promise<void> {
  try {
    const subscriptions = await getUserLanguageSubscriptions(userId);
    
    for (const subscription of subscriptions) {
      await sendLanguageSpecificDailyDigest(userId, subscription.languageId, isTest);
    }
  } catch (error) {
    console.error('Error sending all language digests:', error);
    throw new Error('Failed to send all language digests');
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

async function generateDailyDigestHTML(userName: string, responses: any[], userId: string, isTest: boolean = false): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const testBadge = isTest ? '<div style="background: #000; color: #fff; padding: 8px 16px; margin-bottom: 20px; text-align: center; font-weight: 600;">🧪 This is a test email</div>' : '';
  
  // Get user's language preference for proper formatting
  const userLanguageCode = await getUserLanguageCode(userId);
  const formatOptions: EmailFormatOptions = {
    selectedLanguage: userLanguageCode,
    isPhoneticEnabled: true,
    isKanaEnabled: true
  };
  
  const responsesHTML = responses.map((response: EmailResponse, index: number) => {
    const contentHTML = formatResponseHTML(response, formatOptions);
    
    return `<div style="border-left:4px solid #000;padding:16px;margin-bottom:16px">
<div style="font-weight:bold;margin-bottom:8px">#${index + 1}</div>
${contentHTML}
</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${currentDate} Dojo Report</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#000">
${testBadge}
<div style="text-align:center;margin-bottom:30px">
<h1>🥋 ${currentDate} Dojo Report</h1>
<p>Today's language learning content</p>
</div>
<p>Hi ${userName},</p>
<p>Here's your personalized daily content from your Kondo Dojo:</p>
${responsesHTML}
<div style="text-align:center;margin:30px 0">
<a href="https://kondoai.com" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block">Continue Learning on Kondo</a>
</div>
<div style="border-top:1px solid #ccc;padding-top:20px;text-align:center;font-size:12px">
<p>You're receiving this because you subscribed to Kondo daily updates.</p>
<p><a href="https://kondoai.com/unsubscribe?token={{unsubscribe_token}}">Unsubscribe</a></p>
</div>
</body>
</html>`;
}

async function generateDailyDigestText(responses: any[], userId: string): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Get user's language preference for proper formatting
  const userLanguageCode = await getUserLanguageCode(userId);
  const formatOptions: EmailFormatOptions = {
    selectedLanguage: userLanguageCode,
    isPhoneticEnabled: true,
    isKanaEnabled: true
  };
  
  const responsesText = responses.map((response: EmailResponse, index: number) => {
    const contentText = formatResponseText(response, formatOptions);
    
    return `${index + 1}. ${contentText}`;
  }).join('\n\n');

  return `
🥋 ${currentDate} Dojo Report

Today's language learning content:

${responsesText}

Continue learning: https://kondoai.com

---
You're receiving this because you subscribed to Kondo daily updates.
Unsubscribe: https://kondoai.com/unsubscribe?token={{unsubscribe_token}}
  `;
}
