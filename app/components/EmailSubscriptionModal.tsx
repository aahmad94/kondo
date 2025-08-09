'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import { 
  subscribeToEmailsAction,
  unsubscribeFromEmailsAction,
  getEmailPreferencesAction,
  updateEmailFrequencyAction,
  updateEmailAddressAction,
  sendTestEmailAction,
  checkDailyContentAvailableAction,
  subscribeToLanguageEmailsAction,
  unsubscribeFromLanguageEmailsAction,
  getLanguageEmailPreferencesAction,
  updateLanguageEmailFrequencyAction,
  sendLanguageTestEmailAction
} from '@/actions/email';

// Shared dots animation CSS
const DOTS_ANIMATION_CSS = `
  .dots-animation::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }
  
  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60% { content: '...'; }
    80%, 100% { content: ''; }
  }
`;

interface EmailSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string; // Language code (e.g., 'ja', 'es')
}

type SubscriptionStatus = 'loading' | 'not-subscribed' | 'subscribed';

export default function EmailSubscriptionModal({ isOpen, onClose, selectedLanguage }: EmailSubscriptionModalProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [languageName, setLanguageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasContent, setHasContent] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Initialize email with user's session email
  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email, email]);

  // Load current preferences when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      setMessage(null); // Clear any previous messages
      loadEmailPreferences();
      checkContentAvailability();
    }
  }, [isOpen, selectedLanguage]);

  const loadEmailPreferences = async () => {
    try {
      setStatus('loading');
      const result = await getLanguageEmailPreferencesAction(selectedLanguage);
      
      if (result.success && result.data) {
        setStatus(result.data.isSubscribed ? 'subscribed' : 'not-subscribed');
        // Use subscription email, fallback to user's email from session, then empty string
        setEmail(result.data.email || session?.user?.email || '');
        setFrequency(result.data.frequency as 'daily' | 'weekly');
        setLanguageName(result.data.languageName);
      } else {
        setStatus('not-subscribed');
        // If we can't load preferences, still populate with user's email
        setEmail(session?.user?.email || '');
        setMessage({ type: 'error', text: result.error || 'Failed to load preferences' });
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
      setStatus('not-subscribed');
      // Even on error, populate with user's email
      setEmail(session?.user?.email || '');
      setMessage({ type: 'error', text: 'Failed to load email preferences' });
    }
  };

  const checkContentAvailability = async () => {
    try {
      const result = await checkDailyContentAvailableAction();
      if (result.success) {
        setHasContent(result.data || false);
        if (!result.data) {
          setMessage({ 
            type: 'info', 
            text: `Create some ${languageName || selectedLanguage} bookmarks in your Dojo first to receive daily content!` 
          });
        }
      }
    } catch (error) {
      console.error('Error checking content availability:', error);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await subscribeToLanguageEmailsAction(selectedLanguage, email.trim(), frequency);
      
      if (result.success) {
        setStatus('subscribed');
        setMessage({ type: 'success', text: result.message || 'Successfully subscribed!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to subscribe' });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setMessage({ type: 'error', text: 'Failed to subscribe to email updates' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await unsubscribeFromLanguageEmailsAction(selectedLanguage);
      
      if (result.success) {
        setStatus('not-subscribed');
        setMessage({ type: 'success', text: result.message || 'Successfully unsubscribed from email updates' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to unsubscribe' });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setMessage({ type: 'error', text: 'Failed to unsubscribe from email updates' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencyChange = async (newFrequency: 'daily' | 'weekly') => {
    if (status !== 'subscribed') return;

    try {
      const result = await updateLanguageEmailFrequencyAction(selectedLanguage, newFrequency);
      
      if (result.success) {
        setFrequency(newFrequency);
        setMessage({ type: 'success', text: `Email frequency updated to ${newFrequency}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update frequency' });
      }
    } catch (error) {
      console.error('Error updating frequency:', error);
      setMessage({ type: 'error', text: 'Failed to update email frequency' });
    }
  };

  const handleEmailChange = async (newEmail: string) => {
    if (status !== 'subscribed' || !newEmail.trim()) return;

    try {
      const result = await updateEmailAddressAction(newEmail.trim());
      
      if (result.success) {
        setEmail(newEmail.trim());
        setMessage({ type: 'success', text: 'Email address updated successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update email' });
      }
    } catch (error) {
      console.error('Error updating email:', error);
      setMessage({ type: 'error', text: 'Failed to update email address' });
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setMessage(null);

    try {
      const result = await sendLanguageTestEmailAction(selectedLanguage);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Test email sent! Check your inbox.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
      <div className="bg-card border border-border p-6 rounded-sm w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">
              Email Updates {languageName ? `(${languageName})` : ''}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-card-foreground hover:text-muted-foreground transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center py-8 text-muted-foreground">
            <span className="font-mono">Loading preferences</span>
            <span className="dots-animation">
              <style jsx>{DOTS_ANIMATION_CSS}</style>
            </span>
          </div>
        )}

        {/* Not Subscribed State */}
        {status === 'not-subscribed' && (
          <div>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-card-foreground mb-2">
                Get reminders for Dojo
              </h3>
              <p className="text-muted-foreground text-sm">
                Subscribe to receive your Dojo Report for {languageName || selectedLanguage} via email.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-border rounded-sm bg-background text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{
                    WebkitBoxShadow: '0 0 0 1000px hsl(var(--background)) inset',
                    WebkitTextFillColor: 'hsl(var(--card-foreground))',
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Frequency
                </label>
                <div className="flex gap-4">
                  {(['daily', 'weekly'] as const).map((freq) => (
                    <label key={freq} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={frequency === freq}
                        onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
                        className="text-primary focus:ring-primary focus:ring-offset-0 bg-background border-border"
                      />
                      <span className="text-sm text-card-foreground capitalize">{freq}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !hasContent}
                  className="w-1/2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subscribed State */}
        {status === 'subscribed' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-medium text-card-foreground">
                You're subscribed!
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="subscribed-email" className="block text-sm font-medium text-card-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="subscribed-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value !== email) {
                      handleEmailChange(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-sm bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  style={{
                    WebkitBoxShadow: '0 0 0 1000px hsl(var(--background)) inset',
                    WebkitTextFillColor: 'hsl(var(--card-foreground))',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Frequency
                </label>
                <div className="flex gap-4">
                  {(['daily', 'weekly'] as const).map((freq) => (
                    <label key={freq} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        value={freq}
                        checked={frequency === freq}
                        onChange={() => handleFrequencyChange(freq)}
                        className="text-primary focus:ring-primary focus:ring-offset-0 bg-background border-border"
                      />
                      <span className="text-sm text-card-foreground capitalize">{freq}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !hasContent}
                  className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSendingTest ? (
                    <>
                      <span>Sending</span>
                      <span className="dots-animation">
                        <style jsx>{DOTS_ANIMATION_CSS}</style>
                      </span>
                    </>
                  ) : 'Send Test Email'}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-1.5 text-sm border border-destructive text-destructive rounded-sm hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSubmitting ? 'Unsubscribing...' : 'Unsubscribe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded-sm border ${
            message.type === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' :
            message.type === 'success' ? 'bg-primary/10 text-primary border-primary/20' :
            'bg-primary/10 text-primary border-primary/20'
          }`}>
            <div className="flex justify-between items-start">
              <p className="text-sm">{message.text}</p>
              <button
                onClick={clearMessage}
                className="ml-2 text-current opacity-70 hover:opacity-100"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Warning */}
        {!hasContent && (
          <div className="mt-4 p-3 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-sm">
            <p className="text-sm">
              ⚠️ You don't have any {languageName || selectedLanguage} content in your Dojo yet. Create some bookmarks first to receive meaningful daily emails!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
