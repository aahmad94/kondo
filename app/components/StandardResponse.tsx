'use client';

import React, { useState, useEffect } from 'react';
import { addFurigana, containsKanji, extractJapaneseFromLine } from '../../lib/furiganaService';
import FuriganaText from './FuriganaText';

interface StandardResponseProps {
  items: string[];
  selectedLanguage?: string;
  responseId?: string | null;
  cachedFurigana?: string | null;
  onFuriganaGenerated?: (furigana: string) => void;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
}

export default function StandardResponse({ items, selectedLanguage = 'ja', responseId, cachedFurigana, onFuriganaGenerated, isFuriganaEnabled = false, isPhoneticEnabled = true }: StandardResponseProps) {
  const [furiganaText, setFuriganaText] = useState<string>(cachedFurigana || '');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Extract the content from each numbered item (removing the "1/", "2/", etc.)
  const processedItems = items.map(item => {
    const match = item.match(/^\s*\d+\/\s*(.*)$/);
    return match ? match[1].trim() : item.trim();
  });

  // Check if this is a Japanese 4-line standard response that needs furigana
  const isJapaneseFourLine = selectedLanguage === 'ja' && processedItems.length === 4;
  const shouldUseFurigana = isJapaneseFourLine && containsKanji(processedItems[0]) && isFuriganaEnabled;

  // Helper function to get phonetic line index based on language
  const getPhoneticLineIndex = (language: string, itemsLength: number) => {
    if (itemsLength < 3) return -1; // No phonetic line for 2-item responses
    
    switch (language) {
      case 'ja': return itemsLength === 4 ? 2 : -1; // 3rd line (index 2) for 4-line Japanese
      case 'zh': return itemsLength >= 3 ? 1 : -1; // 2nd line (index 1) for Chinese
      case 'ko': return itemsLength >= 3 ? 1 : -1; // 2nd line (index 1) for Korean
      case 'ar': return itemsLength === 4 ? 2 : -1; // 3rd line (index 2) for 4-line Arabic
      default: return -1;
    }
  };

  const phoneticLineIndex = getPhoneticLineIndex(selectedLanguage, processedItems.length);

  // Notify parent when furigana changes
  useEffect(() => {
    if (furiganaText && onFuriganaGenerated) {
      onFuriganaGenerated(furiganaText);
    }
  }, [furiganaText, onFuriganaGenerated]);

  useEffect(() => {
    const generateFurigana = async () => {
      if (!shouldUseFurigana) return;
      
      // If we already have cached furigana, don't make an API call
      if (cachedFurigana) {
        setFuriganaText(cachedFurigana);
        return;
      }

      // Add a small random delay to stagger requests
      const delay = Math.random() * 100; // 0-100ms random delay
      await new Promise(resolve => setTimeout(resolve, delay));

      setIsLoading(true);
      try {
        const japaneseText = processedItems[0];
        const hiraganaText = processedItems[1];
        
        const furiganaResult = await addFurigana(japaneseText, hiraganaText, responseId || undefined);
        setFuriganaText(furiganaResult);
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        console.error('Error generating furigana:', error);
        // If this is the first few attempts and we haven't succeeded yet, retry
        if (retryCount < 3) {
          console.log(`Retrying furigana generation (attempt ${retryCount + 1})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        } else {
          // After 3 retries, give up and show original text
          setFuriganaText(''); 
        }
      } finally {
        setIsLoading(false);
      }
    };

    generateFurigana();
  }, [shouldUseFurigana, processedItems[0], processedItems[1], retryCount, responseId, cachedFurigana]);

  // If this is a Japanese 4-line response with kanji and furigana is enabled, render the enhanced version
  if (shouldUseFurigana) {
    return (
      <div className="pr-3" style={{ color: '#b59f3b' }}>
        <div className="space-y-2">
          {/* First line - Japanese text with furigana */}
          <div className="text-xl font-medium">
            {furiganaText && !isLoading ? (
              <FuriganaText furiganaHtml={furiganaText} fontSize="1.25rem" />
            ) : (
              <span>{processedItems[0]}</span>
            )}
          </div>

          {/* Second line - Romaji pronunciation (skip hiragana when furigana is enabled) */}
          {isPhoneticEnabled && (
            <div className="text-sm opacity-80 italic" style={{ color: 'rgb(181, 159, 59, 0.60)' }}>
              {processedItems[2]}
            </div>
          )}

          {/* Third line - English translation */}
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[3]}
          </span>
        </div>
      </div>
    );
  }

  // For Japanese 4-line responses when furigana is disabled, show all 4 lines
  if (isJapaneseFourLine && !isFuriganaEnabled) {
    return (
      <div className="pr-3" style={{ color: '#b59f3b' }}>
        <div className="space-y-2">
          {/* First line - Japanese text without furigana */}
          <div className="text-xl font-medium">
            {processedItems[0]}
          </div>

          {/* Second line - Hiragana/katakana reading */}
          <div className="text-sm opacity-80">
            {processedItems[1]}
          </div>

          {/* Third line - Romaji pronunciation */}
          {isPhoneticEnabled && (
            <div className="text-sm opacity-80 italic" style={{ color: 'rgb(181, 159, 59, 0.60)' }}>
              {processedItems[2]}
            </div>
          )}

          {/* Fourth line - English translation */}
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[3]}
          </span>
        </div>
      </div>
    );
  }

  // Original rendering logic for non-Japanese or non-4-line cases
  return (
    <div className="pr-3" style={{ color: '#b59f3b' }}>
      <div className="space-y-2">
        {/* First line - larger text for Japanese 4-line responses, regular for others */}
        <div className={`font-medium ${isJapaneseFourLine ? 'text-xl' : 'text-lg'}`}>
          {processedItems[0]}
        </div>

        {/* Second line - subtle or blue depending on number of items */}
        {processedItems.length === 2 ? (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[1]}
          </span>
        ) : processedItems.length === 3 ? (
          // For 3-item responses, check if line 1 is phonetic
          phoneticLineIndex === 1 && !isPhoneticEnabled ? null : (
            <div className="text-sm opacity-80">
              {processedItems[1]}
            </div>
          )
        ) : processedItems.length === 4 ? (
          // For 4-item responses, check if line 1 is phonetic
          phoneticLineIndex === 1 && !isPhoneticEnabled ? null : (
            <div className="text-sm opacity-80">
              {processedItems[1]}
            </div>
          )
        ) : null}

        {/* Third line - italic (for 4 items), or blue (for 3 items) */}
        {processedItems.length === 3 ? (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[2]}
          </span>
        ) : processedItems.length === 4 ? (
          // For 4-item responses, check if line 2 is phonetic
          phoneticLineIndex === 2 && !isPhoneticEnabled ? null : (
            <div className="text-sm opacity-60 italic">
              {processedItems[2]}
            </div>
          )
        ) : null}

        {/* Fourth line - blue (for 4 items) */}
        {processedItems.length === 4 && (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[3]}
          </span>
        )}
      </div>
    </div>
  );
} 