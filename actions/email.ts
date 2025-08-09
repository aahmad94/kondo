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
  checkUserHasDailyContent,
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  type EmailPreferences,
  type SubscriptionData
} from "@/lib/email";

// Type definitions for return values
type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Subscribe user to email updates
 * Called from EmailSubscriptionModal when user subscribes
 */
export async function subscribeToEmailsAction(
  email: string, 
  frequency: 'daily' | 'weekly'
): Promise<ActionResult<SubscriptionData>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Validate email format
    if (!validateEmailAddress(email)) {
      throw new Error('Invalid email address format');
    }

    // Subscribe user in database
    const subscriptionData = await subscribeUserToEmails(
      session.userId, 
      email, 
      frequency
    );

    // Send welcome email
    await sendWelcomeEmail(email, session.user?.name || 'Kondo User');

    return {
      success: true,
      data: subscriptionData,
      message: `Successfully subscribed to ${frequency} email updates`
    };
  } catch (error) {
    console.error('Error subscribing to emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subscribe to emails'
    };
  }
}

/**
 * Unsubscribe user from email updates
 * Called from EmailSubscriptionModal or unsubscribe links in emails
 */
export async function unsubscribeFromEmailsAction(): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    await unsubscribeUserFromEmails(session.userId);

    return {
      success: true,
      message: 'Successfully unsubscribed from email updates'
    };
  } catch (error) {
    console.error('Error unsubscribing from emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsubscribe from emails'
    };
  }
}

/**
 * Get current user email preferences
 * Called when EmailSubscriptionModal opens to show current state
 */
export async function getEmailPreferencesAction(): Promise<ActionResult<EmailPreferences>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    const preferences = await getUserEmailPreferences(session.userId);

    return {
      success: true,
      data: preferences
    };
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch email preferences'
    };
  }
}

/**
 * Update email frequency without changing subscription status
 * Called from EmailSubscriptionModal when user changes frequency
 */
export async function updateEmailFrequencyAction(
  frequency: 'daily' | 'weekly'
): Promise<ActionResult<EmailPreferences>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    const updatedPreferences = await updateEmailFrequency(session.userId, frequency);

    return {
      success: true,
      data: updatedPreferences,
      message: `Email frequency updated to ${frequency}`
    };
  } catch (error) {
    console.error('Error updating email frequency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email frequency'
    };
  }
}

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
 * Send test email to current user
 * Called from EmailSubscriptionModal "Send Test Email" button
 */
export async function sendTestEmailAction(): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.userId) {
      throw new Error('Unauthorized: No user session found');
    }

    // Check if user is subscribed
    const preferences = await getUserEmailPreferences(session.userId);
    if (!preferences.isSubscribed || !preferences.email) {
      throw new Error('User is not subscribed to emails');
    }

    // Send test email with sample daily content
    await sendDailyDigest(session.userId, true); // true = test mode

    return {
      success: true,
      message: 'Test email sent successfully'
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email'
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
