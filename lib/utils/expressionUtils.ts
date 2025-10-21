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

/**
 * Transform numbered list format from "1/" to "1." for clarification responses
 * Used when responseType is 'clarification' to ensure consistent Markdown formatting
 */
export function formatClarificationResponse(response: string): string {
  // Replace numbered list format "1/" "2/" etc. with "1." "2." etc.
  return response.replace(/^(\d+)\//gm, '$1.');
}

/**
 * Calculate placeholder dimensions based on text length and font size
 * Used for creating placeholder elements that match the expected size of actual content
 */
export function calculatePlaceholderDimensions(
  text: string, 
  fontSize: 'sm' | 'base' | 'lg' | 'xl' = 'base', 
  divWidthRem?: number,
  script: 'latin' | 'hiragana' | 'katakana' | 'kanji' | 'chinese' | 'furigana' = 'latin'
): { width: string; height: string } {
  const fontConfig = {
    'sm': { charWidth: 0.5, height: 1.25 },   // text-sm: 0.875rem font, ~1.25rem line height
    'base': { charWidth: 0.6, height: 1.5 },  // text-base: 1rem font, ~1.5rem line height
    'lg': { charWidth: 0.7, height: 1.75 },   // text-lg: 1.125rem font, ~1.75rem line height
    'xl': { charWidth: 1, height: 2.0 }     // text-xl: 1.25rem font, ~2rem line height
  };

  // Script-specific character width multipliers
  const scriptMultipliers = {
    'latin': 1.0,      // Default for English/romanization
    'hiragana': 1.7,   // Hiragana characters are wider
    'katakana': 1.3,   // Katakana characters are slightly wider
    'kanji': 1.2,      // Kanji characters are the widest
    'chinese': 1.2,    // Chinese characters similar to kanji
    'furigana': 1.25    // Kanji with furigana annotations (wider than plain kanji)
  };
  
  const config = fontConfig[fontSize];
  const scriptMultiplier = scriptMultipliers[script];
  const textWidthRem = text.length * config.charWidth * scriptMultiplier;
  
  let actualHeight = config.height;
  let actualWidth = Math.min(Math.max(textWidthRem, 3), 25); // Min 3rem, max 25rem
  
  // If divWidth is provided, calculate how many lines the text would wrap to
  if (divWidthRem) {
    const lines = Math.ceil(textWidthRem / divWidthRem);
    actualHeight = config.height * lines;
    // For multi-line text, constrain width to the container width
    actualWidth = Math.min(textWidthRem, divWidthRem);
  }
  
  return {
    width: `${actualWidth}rem`,
    height: `${actualHeight}rem`
  };
} 