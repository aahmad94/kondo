'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { 
  subscribeUserToEmails, 
  unsubscribeUserFromEmails, 
  getUserEmailPreferences,
  updateEmailFrequency,
  updateUserEmailAddress,
  validateEmailAddress,
  sendWelcomeEmail,
  sendDailyDigest,
  sendLanguageSpecificDailyDigest,
  sendAllLanguageDigests,
  checkUserHasDailyContent,
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  type EmailPreferences,
  type SubscriptionData
} from "@/lib/email";
import { prisma } from "@/lib/database";

// Type definitions for return values
type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Language-specific subscription data
type LanguageSubscriptionData = {
  isSubscribed: boolean;
  email: string;
  frequency: 'daily' | 'weekly';
  languageCode: string;
  languageName: string;
};









/**
 * Update user's email address for subscriptions
 * Called from EmailSubscriptionModal when user changes email
 */
export async function updateEmailAddressAction(
  newEmail: string
): Promise<ActionResult<EmailPreferences>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Validate email format
    if (!validateEmailAddress(newEmail)) {
      throw new Error('Invalid email address format');
    }

    const updatedPreferences = await updateUserEmailAddress(session.userId, newEmail);

    return {
      success: true,
      data: updatedPreferences,
      message: 'Email address updated successfully'
    };
  } catch (error) {
    console.error('Error updating email address:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email address'
    };
  }
}



/**
 * Manually trigger daily email for user (admin/dev function)
 * Called from admin panel or debugging
 */
export async function sendManualDailyEmailAction(): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    await sendDailyDigest(session.userId, false); // false = real email

    return {
      success: true,
      message: 'Daily email sent successfully'
    };
  } catch (error) {
    console.error('Error sending manual daily email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send daily email'
    };
  }
}

/**
 * Unsubscribe user via email token (for unsubscribe links in emails)
 * Called from unsubscribe page with token from email
 */
export async function unsubscribeViaTokenAction(
  token: string
): Promise<ActionResult> {
  try {
    // Validate and decode token to get userId
    const userId = await validateUnsubscribeToken(token);
    
    if (!userId) {
      throw new Error('Invalid or expired unsubscribe token');
    }

    await unsubscribeUserFromEmails(userId);

    return {
      success: true,
      message: 'Successfully unsubscribed from email updates'
    };
  } catch (error) {
    console.error('Error unsubscribing via token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsubscribe'
    };
  }
}

/**
 * Generate unsubscribe token for current user
 * Used internally when sending emails
 */
export async function generateUnsubscribeTokenAction(): Promise<ActionResult<string>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    const token = await generateUnsubscribeToken(session.userId);

    return {
      success: true,
      data: token
    };
  } catch (error) {
    console.error('Error generating unsubscribe token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate unsubscribe token'
    };
  }
}

/**
 * Validate email address format
 * Called from EmailSubscriptionModal on input change
 */
export async function validateEmailAction(email: string): Promise<ActionResult<boolean>> {
  try {
    const isValid = validateEmailAddress(email);
    
    return {
      success: true,
      data: isValid,
      message: isValid ? 'Valid email address' : 'Invalid email address format'
    };
  } catch (error) {
    console.error('Error validating email:', error);
    return {
      success: false,
      error: 'Failed to validate email address'
    };
  }
}

/**
 * Check if user has daily content available for email
 * Called before showing subscription modal to warn if no content
 */
export async function checkDailyContentAvailableAction(): Promise<ActionResult<boolean>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    const hasContent = await checkUserHasDailyContent(session.userId);

    return {
      success: true,
      data: hasContent,
      message: hasContent 
        ? 'Daily content available' 
        : 'No daily content available - create some bookmarks first!'
    };
  } catch (error) {
    console.error('Error checking daily content:', error);
    return {
      success: false,
      error: 'Failed to check daily content availability'
    };
  }
}

/**
 * Subscribe user to language-specific email updates
 * Called from EmailSubscriptionModal when user subscribes to a specific language
 */
export async function subscribeToLanguageEmailsAction(
  languageCode: string,
  email: string, 
  frequency: 'daily' | 'weekly'
): Promise<ActionResult<LanguageSubscriptionData>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Validate email format
    if (!validateEmailAddress(email)) {
      throw new Error('Invalid email address format');
    }

    // Get language information
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, name: true, code: true }
    });

    if (!language) {
      throw new Error('Invalid language selected');
    }

    // Create or update language-specific subscription
    const subscription = await prisma.userLanguageSubscription.upsert({
      where: {
        userId_languageId: {
          userId: session.userId,
          languageId: language.id
        }
      },
      update: {
        subscribed: true,
        subscriptionEmail: email,
        emailFrequency: frequency,
        emailSubscribedAt: new Date(),
        unsubscribedAt: null
      },
      create: {
        userId: session.userId,
        languageId: language.id,
        subscribed: true,
        subscriptionEmail: email,
        emailFrequency: frequency,
        emailSubscribedAt: new Date()
      }
    });

    // Send welcome email
    await sendWelcomeEmail(email, session.user?.name || 'Kondo User');

    return {
      success: true,
      data: {
        isSubscribed: true,
        email,
        frequency,
        languageCode: language.code,
        languageName: language.name
      },
      message: `Successfully subscribed to ${frequency} ${language.name} email updates`
    };
  } catch (error) {
    console.error('Error subscribing to language emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subscribe to language emails'
    };
  }
}

/**
 * Unsubscribe user from language-specific email updates
 */
export async function unsubscribeFromLanguageEmailsAction(
  languageCode: string
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Get language information
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, name: true }
    });

    if (!language) {
      throw new Error('Invalid language selected');
    }

    // Update subscription status
    await prisma.userLanguageSubscription.updateMany({
      where: {
        userId: session.userId,
        languageId: language.id
      },
      data: {
        subscribed: false,
        unsubscribedAt: new Date()
      }
    });

    return {
      success: true,
      message: `Successfully unsubscribed from ${language.name} email updates`
    };
  } catch (error) {
    console.error('Error unsubscribing from language emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsubscribe from language emails'
    };
  }
}

/**
 * Get current user's language-specific email preferences
 */
export async function getLanguageEmailPreferencesAction(
  languageCode: string
): Promise<ActionResult<LanguageSubscriptionData>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Get language information
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, name: true, code: true }
    });

    if (!language) {
      throw new Error('Invalid language selected');
    }

    // Get user's subscription for this language
    const subscription = await prisma.userLanguageSubscription.findUnique({
      where: {
        userId_languageId: {
          userId: session.userId,
          languageId: language.id
        }
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    // Return subscription data or default values
    const subscriptionData: LanguageSubscriptionData = {
      isSubscribed: subscription?.subscribed || false,
      email: subscription?.subscriptionEmail || subscription?.user?.email || '',
      frequency: (subscription?.emailFrequency as 'daily' | 'weekly') || 'daily',
      languageCode: language.code,
      languageName: language.name
    };

    return {
      success: true,
      data: subscriptionData
    };
  } catch (error) {
    console.error('Error fetching language email preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch language email preferences'
    };
  }
}

/**
 * Update language-specific email frequency
 */
export async function updateLanguageEmailFrequencyAction(
  languageCode: string,
  frequency: 'daily' | 'weekly'
): Promise<ActionResult<LanguageSubscriptionData>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Get language information
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, name: true, code: true }
    });

    if (!language) {
      throw new Error('Invalid language selected');
    }

    // Update the subscription frequency
    const subscription = await prisma.userLanguageSubscription.update({
      where: {
        userId_languageId: {
          userId: session.userId,
          languageId: language.id
        }
      },
      data: {
        emailFrequency: frequency
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    return {
      success: true,
      data: {
        isSubscribed: subscription.subscribed,
        email: subscription.subscriptionEmail || subscription.user?.email || '',
        frequency: frequency,
        languageCode: language.code,
        languageName: language.name
      },
      message: `${language.name} email frequency updated to ${frequency}`
    };
  } catch (error) {
    console.error('Error updating language email frequency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update language email frequency'
    };
  }
}

/**
 * Send test email for specific language
 */
export async function sendLanguageTestEmailAction(
  languageCode: string
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Get language information
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, name: true }
    });

    if (!language) {
      throw new Error('Invalid language selected');
    }

    // Send test email for this specific language
    await sendLanguageSpecificDailyDigest(session.userId, language.id, true);

    return {
      success: true,
      message: `Test ${language.name} email sent successfully!`
    };
  } catch (error) {
    console.error('Error sending language test email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send language test email'
    };
  }
}
