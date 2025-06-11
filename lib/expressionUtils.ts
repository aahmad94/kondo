/**
 * Expression utility functions for text processing and response filtering
 * Used across GPTResponse, flashcard mode, and audio utilities
 */

/**
 * Extract expressions from response text
 * Used for determining if a response has expressions (for buttons, flashcards, etc.)
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
 * Check if a response has expressions (helper function)
 */
export function hasExpressions(response: string): boolean {
  return extractExpressions(response).length > 0;
} 