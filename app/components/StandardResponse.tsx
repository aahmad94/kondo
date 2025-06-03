'use client';

import React, { useState, useEffect } from 'react';
import { addFurigana, containsKanji, extractJapaneseFromLine } from '../../lib/furiganaService';
import FuriganaText from './FuriganaText';

interface StandardResponseProps {
  items: string[];
  selectedLanguage?: string;
}

export default function StandardResponse({ items, selectedLanguage = 'ja' }: StandardResponseProps) {
  const [furiganaText, setFuriganaText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Extract the content from each numbered item (removing the "1/", "2/", etc.)
  const processedItems = items.map(item => {
    const match = item.match(/^\s*\d+\/\s*(.*)$/);
    return match ? match[1].trim() : item.trim();
  });

  // Check if this is a Japanese 4-line standard response that needs furigana
  const isJapaneseFourLine = selectedLanguage === 'ja' && processedItems.length === 4;
  const shouldUseFurigana = isJapaneseFourLine && containsKanji(processedItems[0]);

  useEffect(() => {
    const generateFurigana = async () => {
      if (!shouldUseFurigana) return;

      // Add a small random delay to stagger requests
      const delay = Math.random() * 100; // 0-100ms random delay
      await new Promise(resolve => setTimeout(resolve, delay));

      setIsLoading(true);
      try {
        const japaneseText = processedItems[0];
        const hiraganaText = processedItems[1];
        
        const furiganaResult = await addFurigana(japaneseText, hiraganaText);
        setFuriganaText(furiganaResult);
      } catch (error) {
        console.error('Error generating furigana:', error);
        setFuriganaText(processedItems[0]); // Fallback to original text
      } finally {
        setIsLoading(false);
      }
    };

    generateFurigana();
  }, [shouldUseFurigana, processedItems[0], processedItems[1]]);

  // If this is a Japanese 4-line response with kanji, render the furigana version
  if (shouldUseFurigana) {
    return (
      <div className="pr-3" style={{ color: '#b59f3b' }}>
        <div className="space-y-2">
          {/* First line - Japanese with furigana (larger text for better furigana spacing) */}
          <div className="text-xl font-medium">
            {isLoading ? (
              <div className="animate-pulse">Loading furigana...</div>
            ) : (
              <FuriganaText furiganaHtml={furiganaText} fontSize="1.15rem" />
            )}
          </div>

          {/* Second line - Romaji pronunciation */}
          <div className="text-sm opacity-80 italic" style={{ color: 'rgb(181, 159, 59, 0.60)' }}>
            {processedItems[2]}
          </div>

          {/* Third line - English translation */}
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[3]}
          </span>
        </div>
      </div>
    );
  }

  // Original rendering logic for non-furigana cases
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
          <div className="text-sm opacity-80">
            {processedItems[1]}
          </div>
        ) : processedItems.length === 4 ? (
          <div className="text-sm opacity-80">
            {processedItems[1]}
          </div>
        ) : null}

        {/* Third line - italic (for 4 items), or blue (for 3 items) */}
        {processedItems.length === 3 ? (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[2]}
          </span>
        ) : processedItems.length === 4 ? (
          <div className="text-sm opacity-60 italic">
            {processedItems[2]}
          </div>
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