/**
 * Audio utility functions for text processing and speech preparation
 */

/**
 * Extract expressions from Japanese response text
 * Used for both voice generation and breakdown logic
 */
export function extractExpressions(response: string): string[] {
  // If the first line doesn't include a number, return an empty array
  // hasExpression will be false, and the response will be rendered as a regular text
  // speaker and breakdown buttons will not be shown
  const firstLineIncludesNumber = response.split('\n')[0].includes('1/');
  if (!firstLineIncludesNumber) {
    return [];
  }

  // Find all numbered items (e.g., 1/ ... 2/ ... 3/ ...)
  const numberedItems: RegExpMatchArray[] = [...response.matchAll(/^\d+\/\s*(.*)$/gm)];
  const notStandardList = numberedItems.some(item => item[0].includes('5/'));
  let expressions: string[] = [];
  
  // If 5 or more, return empty array (not standard list)
  if (notStandardList) {
    return [];
  } else {
    expressions = numberedItems
      .map((match: RegExpMatchArray) => (match[0].includes('1/') ? match[1].trim() : undefined))
      .filter((item: string | undefined): item is string => !!item);
  }
  
  return expressions.filter(Boolean);
}

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