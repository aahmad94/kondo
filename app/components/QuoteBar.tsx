'use client';

import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface QuoteBarProps {
  quotedText: string;
  onClear: () => void;
  onHeightChange?: (height: number) => void;
}

export default function QuoteBar({ quotedText, onClear, onHeightChange }: QuoteBarProps) {
  const quoteBarRef = useRef<HTMLDivElement>(null);

  // Track height changes
  useEffect(() => {
    if (quoteBarRef.current && onHeightChange) {
      const height = quoteBarRef.current.offsetHeight;
      onHeightChange(height);
    }

    // Cleanup on unmount
    return () => {
      if (onHeightChange) {
        onHeightChange(0);
      }
    };
  }, [quotedText, onHeightChange]);

  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Clean the quoted text (remove any existing "Replace this text..." content)
  const cleanQuotedText = quotedText
    .replace(/\n\n\* Replace this text to ask anything about the quoted response above\.\.\.$/g, '')
    .trim();

  return (
    <div ref={quoteBarRef} className="bg-[#111111] border-t border-gray-700 px-4 py-3 mx-2 mb-2 rounded-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div 
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: '#b59f3b' }} // Using the same yellow color from GPTResponse
          >
            {truncateText(cleanQuotedText)}
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200 p-1"
          aria-label="Clear quote"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 