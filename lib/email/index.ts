export {
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
  type SubscriptionData,
} from './emailService';

// Email formatting modules
export * from './format';
export * from './standardFormat';
export * from './markdownFormat';
