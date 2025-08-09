export {
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
  type SubscriptionData,
} from './emailService';

// Email formatting modules
export * from './format';
export * from './standardFormat';
export * from './markdownFormat';
