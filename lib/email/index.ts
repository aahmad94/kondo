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
  sendDailyDigestByLanguageCode,
  sendAllLanguageDigests,
  checkUserHasDailyContent,
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  getUserLanguageCode,
  type EmailPreferences,
  type SubscriptionData,
} from './emailService';

// Email formatting modules
export * from './format';
export * from './standardFormat';
export * from './markdownFormat';

// Email template modules
export * from './welcomeTemplate';
export * from './dailyDigestTemplate';
