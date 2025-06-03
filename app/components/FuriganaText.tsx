'use client';

import React from 'react';

interface FuriganaTextProps {
  furiganaHtml: string;
  className?: string;
  fontSize?: string;
}

export default function FuriganaText({ furiganaHtml, className = '', fontSize }: FuriganaTextProps) {
  return (
    <div 
      className={`furigana-text ${className}`}
      dangerouslySetInnerHTML={{ __html: furiganaHtml }}
      style={{
        lineHeight: '2em',
        ...(fontSize && { fontSize })
      }}
    />
  );
} 