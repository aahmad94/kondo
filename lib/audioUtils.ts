/**
 * Audio utility functions for text processing and speech preparation
 */

import { extractExpressions } from './expressionUtils';

/**
 * Prepare text for speech by extracting Japanese expressions
 * Handles different response formats and cleans text appropriately
 */
export function prepareTextForSpeech(response: string): string {
  const expressions = extractExpressions(response);
  let textToSpeak = expressions.join('\n');
  
  // Handle responses with " - " format by extracting text before parentheses
  if (response.includes(' - ')) {
    textToSpeak = response
      .split('\n')
      .map(line => {
        const match = line.match(/^([^（(]+)/);
        return match ? match[1].trim() : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  
  return textToSpeak;
}

/**
 * Extract Japanese text from demo response content
 * Used specifically for GPTResponseDemo components
 */
export function extractJapaneseFromDemo(demoContent: { japanese: string }): string {
  return demoContent.japanese;
} 