/**
 * @jest-environment node
 */
import { 
  subscribeToEmailsAction,
  unsubscribeFromEmailsAction,
  getEmailPreferencesAction,
  validateEmailAction,
  checkDailyContentAvailableAction 
} from '../../actions/email';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock email service
jest.mock('../../lib/email/emailService', () => ({
  subscribeUserToEmails: jest.fn(),
  unsubscribeUserFromEmails: jest.fn(),
  getUserEmailPreferences: jest.fn(),
  validateEmailAddress: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  checkUserHasDailyContent: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import * as emailService from '../../lib/email/emailService';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockSubscribeUserToEmails = emailService.subscribeUserToEmails as jest.MockedFunction<typeof emailService.subscribeUserToEmails>;
const mockUnsubscribeUserFromEmails = emailService.unsubscribeUserFromEmails as jest.MockedFunction<typeof emailService.unsubscribeUserFromEmails>;
const mockGetUserEmailPreferences = emailService.getUserEmailPreferences as jest.MockedFunction<typeof emailService.getUserEmailPreferences>;
const mockValidateEmailAddress = emailService.validateEmailAddress as jest.MockedFunction<typeof emailService.validateEmailAddress>;
const mockSendWelcomeEmail = emailService.sendWelcomeEmail as jest.MockedFunction<typeof emailService.sendWelcomeEmail>;
const mockCheckUserHasDailyContent = emailService.checkUserHasDailyContent as jest.MockedFunction<typeof emailService.checkUserHasDailyContent>;

describe('Email Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToEmailsAction', () => {
    it('should successfully subscribe user to emails', async () => {
      // Arrange
      const mockSession = { userId: 'user123', user: { name: 'Test User' } };
      const email = 'test@example.com';
      const frequency = 'daily' as const;
      const subscriptionData = {
        userId: 'user123',
        email,
        frequency,
        subscriptionDate: new Date(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockValidateEmailAddress.mockReturnValue(true);
      mockSubscribeUserToEmails.mockResolvedValue(subscriptionData);
      mockSendWelcomeEmail.mockResolvedValue();

      // Act
      const result = await subscribeToEmailsAction(email, frequency);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(subscriptionData);
      expect(result.message).toContain('Successfully subscribed to daily email updates');
      expect(mockSubscribeUserToEmails).toHaveBeenCalledWith('user123', email, frequency);
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(email, 'Test User');
    });

    it('should handle invalid email format', async () => {
      // Arrange
      const mockSession = { userId: 'user123', user: { name: 'Test User' } };
      const email = 'invalid-email';
      const frequency = 'daily' as const;

      mockGetServerSession.mockResolvedValue(mockSession);
      mockValidateEmailAddress.mockReturnValue(false);

      // Act
      const result = await subscribeToEmailsAction(email, frequency);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address format');
      expect(mockSubscribeUserToEmails).not.toHaveBeenCalled();
    });

    it('should handle unauthorized access', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      // Act
      const result = await subscribeToEmailsAction('test@example.com', 'daily');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized: No user session found');
    });
  });

  describe('unsubscribeFromEmailsAction', () => {
    it('should successfully unsubscribe user', async () => {
      // Arrange
      const mockSession = { userId: 'user123' };
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUnsubscribeUserFromEmails.mockResolvedValue();

      // Act
      const result = await unsubscribeFromEmailsAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully unsubscribed from email updates');
      expect(mockUnsubscribeUserFromEmails).toHaveBeenCalledWith('user123');
    });
  });

  describe('getEmailPreferencesAction', () => {
    it('should return user email preferences', async () => {
      // Arrange
      const mockSession = { userId: 'user123' };
      const preferences = {
        isSubscribed: true,
        email: 'test@example.com',
        frequency: 'daily' as const,
        lastEmailSent: new Date(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockGetUserEmailPreferences.mockResolvedValue(preferences);

      // Act
      const result = await getEmailPreferencesAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(preferences);
    });
  });

  describe('validateEmailAction', () => {
    it('should validate correct email format', async () => {
      // Arrange
      const email = 'test@example.com';
      mockValidateEmailAddress.mockReturnValue(true);

      // Act
      const result = await validateEmailAction(email);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.message).toBe('Valid email address');
    });

    it('should reject invalid email format', async () => {
      // Arrange
      const email = 'invalid-email';
      mockValidateEmailAddress.mockReturnValue(false);

      // Act
      const result = await validateEmailAction(email);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.message).toBe('Invalid email address format');
    });
  });

  describe('checkDailyContentAvailableAction', () => {
    it('should return true when user has daily content', async () => {
      // Arrange
      const mockSession = { userId: 'user123' };
      mockGetServerSession.mockResolvedValue(mockSession);
      mockCheckUserHasDailyContent.mockResolvedValue(true);

      // Act
      const result = await checkDailyContentAvailableAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.message).toBe('Daily content available');
    });

    it('should return false when user has no daily content', async () => {
      // Arrange
      const mockSession = { userId: 'user123' };
      mockGetServerSession.mockResolvedValue(mockSession);
      mockCheckUserHasDailyContent.mockResolvedValue(false);

      // Act
      const result = await checkDailyContentAvailableAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.message).toBe('No daily content available - create some bookmarks first!');
    });
  });
});
