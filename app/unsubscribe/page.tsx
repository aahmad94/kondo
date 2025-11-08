'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const LANGUAGE_NAMES: Record<string, string> = {
  'ja': 'Japanese',
  'zh': 'Chinese',
  'es': 'Spanish',
  'ko': 'Korean',
  'ar': 'Arabic',
  'all': 'All Languages'
};

const LANGUAGE_FLAGS: Record<string, string> = {
  'ja': '🇯🇵',
  'zh': '🇨🇳',
  'es': '🇪🇸',
  'ko': '🇰🇷',
  'ar': '🇸🇦',
  'all': '🌐'
};

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [languageCode, setLanguageCode] = useState<string>('');
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const urlToken = searchParams?.get('token');
    
    if (!urlToken) {
      setStatus('invalid');
      setMessage('Invalid unsubscribe link. No token provided.');
      return;
    }

    // Decode token to get language info
    try {
      const decoded = Buffer.from(urlToken, 'base64').toString('utf-8');
      const [, langCode] = decoded.split(':');
      setLanguageCode(langCode || 'all');
      setToken(urlToken);
      setStatus('confirm');
    } catch (error) {
      setStatus('invalid');
      setMessage('Invalid unsubscribe token format.');
    }
  }, [searchParams]);

  const handleUnsubscribe = async (unsubscribeAll: boolean = false) => {
    setStatus('loading');
    
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, unsubscribeAll }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setLanguageCode(data.languageCode);
        setMessage(data.message || 'You have been successfully unsubscribed.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    }
  };

  const languageName = LANGUAGE_NAMES[languageCode] || languageCode.toUpperCase();
  const languageFlag = LANGUAGE_FLAGS[languageCode] || '🌐';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-black p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Unsubscribe</h1>
        
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-gray-600">Processing your request...</p>
          </div>
        )}

        {status === 'confirm' && (
          <div className="space-y-6">
            <div className="text-6xl mb-4">{languageFlag}</div>
            <div className="mb-6">
              <p className="text-lg font-semibold mb-2">
                Unsubscribe from {languageName} emails?
              </p>
              <p className="text-gray-600 text-sm">
                You're about to stop receiving Dojo Reports for {languageName}.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleUnsubscribe(false)}
                className="w-full bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors font-medium"
              >
                Unsubscribe from {languageName} only
              </button>
              
              {languageCode !== 'all' && (
                <button
                  onClick={() => handleUnsubscribe(true)}
                  className="w-full border-2 border-black text-black px-6 py-3 hover:bg-gray-100 transition-colors font-medium"
                >
                  Unsubscribe from all languages
                </button>
              )}
              
              <a 
                href="https://kondoai.com" 
                className="block text-gray-600 text-sm hover:text-black transition-colors mt-4"
              >
                Never mind, keep my subscription
              </a>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-lg mb-4">{message}</p>
            <p className="text-gray-600 text-sm">
              {languageCode === 'all' 
                ? "You've been unsubscribed from all Kondo emails. You can resubscribe anytime from your account settings."
                : `You'll no longer receive ${languageName} Dojo Reports. Your other language subscriptions remain active.`
              }
            </p>
            <a 
              href="https://kondoai.com" 
              className="inline-block mt-6 bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
            >
              Return to Kondo
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-lg mb-4 text-red-600">{message}</p>
            <p className="text-gray-600 text-sm mb-4">
              If this problem persists, please contact our support team.
            </p>
            <a 
              href="https://kondoai.com" 
              className="inline-block bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
            >
              Return to Kondo
            </a>
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-lg mb-4 text-red-600">{message}</p>
            <p className="text-gray-600 text-sm mb-4">
              Please use the unsubscribe link from your email or contact support for assistance.
            </p>
            <a 
              href="https://kondoai.com" 
              className="inline-block bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
            >
              Return to Kondo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

