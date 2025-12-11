/**
 * Expression utility functions for text processing and response filtering
 * Used across GPTResponse, flashcard mode, and audio utilities
 */

/**
 * Extract expressions from response text
 * Used for determining if a response has expressions (for buttons, flashcards, etc.)
 */
export function extractExpressions(response: string): string[] {
  // Find all numbered items (e.g., 1/ ... 2/ ... 3/ ...)
  const numberedItems: RegExpMatchArray[] = [...response.matchAll(/^\d+\/\s*(.*)$/gm)];
  
  // If no numbered items found, return empty array
  if (numberedItems.length === 0) {
    return [];
  }
  
  // Check if we have a valid phrase format (2-4 numbered items, sequential starting from 1)
  const numbers = numberedItems.map(item => {
    const match = item[0].match(/^\s*(\d+)\//);
    return match ? parseInt(match[1]) : null;
  }).filter((num): num is number => num !== null);
  
  // Check if numbers are sequential starting from 1 and within valid range (2-4 items)
  const isSequential = numbers.length >= 2 && numbers.length <= 4 && 
                       numbers.every((num, i) => num === i + 1);
  
  // If 5 or more, return empty array (not standard list)
  const notStandardList = numbers.some(num => num >= 5);
  if (notStandardList || !isSequential) {
    return [];
  }
  
  // Extract expressions from numbered items that start with 1/
  const expressions = numberedItems
    .map((match: RegExpMatchArray) => (match[0].includes('1/') ? match[1].trim() : undefined))
    .filter((item: string | undefined): item is string => !!item);
  
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
 * Check if a block of lines represents a valid expression for StandardResponse
 * Valid expressions have 2-4 numbered lines and the first line contains extractable content
 */
export function isValidExpression(lines: string[]): boolean {
  const numberedLines = lines.filter(line => line.match(/^\s*\d+\/\s*/));
  
  // Must have 2-4 numbered items
  if (![2, 3, 4].includes(numberedLines.length)) {
    return false;
  }
  
  // Check if first numbered line has extractable Japanese/content
  const firstLine = numberedLines[0];
  const match = firstLine.match(/^\s*1\/\s*(.*)$/);
  if (!match || !match[1] || match[1].trim().length === 0) {
    return false;
  }
  
  return true;
}

export interface ClarificationBlock {
  type: 'expression' | 'markdown';
  lines: string[];
  rawText: string;
}

/**
 * Parse clarification responses into blocks that can be rendered as StandardResponse or Markdown
 * This enables multiple StandardResponse components within one GPT response
 */
export function parseClarificationResponse(response: string): ClarificationBlock[] {
  const blocks: ClarificationBlock[] = [];
  
  // First, try to detect and merge consecutive numbered items that might be split by blank lines
  const allLines = response.split(/\r?\n/);
  const numberedLinesWithIndices: Array<{ idx: number; number: number; line: string }> = [];
  
  // Find all lines that start with numbered format (1/, 2/, 3/, etc.) and extract their numbers
  allLines.forEach((line, idx) => {
    const match = line.match(/^\s*(\d+)\/\s*/);
    if (match) {
      numberedLinesWithIndices.push({
        idx,
        number: parseInt(match[1]),
        line: line.trim()
      });
    }
  });
  
  // Check if we have sequential numbered items starting from 1 that form a phrase (2-4 items)
  // and if they're separated by blank lines, merge them
  let rawBlocks: string[] = [];
  if (numberedLinesWithIndices.length >= 2 && numberedLinesWithIndices.length <= 4) {
    // Check if these are sequential starting from 1 (1/, 2/, 3/ or 1/, 2/, 3/, 4/)
    const isSequential = numberedLinesWithIndices.every((item, i) => item.number === i + 1);
    
    if (isSequential) {
      const firstIdx = numberedLinesWithIndices[0].idx;
      const lastIdx = numberedLinesWithIndices[numberedLinesWithIndices.length - 1].idx;
      const linesBetween = lastIdx - firstIdx;
      
      // If numbered items are close together (within reasonable range), treat as one block
      if (linesBetween <= 10) { // Allow some spacing between items
        const mergedBlock = allLines.slice(firstIdx, lastIdx + 1)
          .filter(line => line.trim()) // Remove blank lines
          .join('\n');
        rawBlocks.push(mergedBlock);
        
        // Add any remaining content before and after
        if (firstIdx > 0) {
          const beforeBlock = allLines.slice(0, firstIdx).join('\n').trim();
          if (beforeBlock) rawBlocks.unshift(beforeBlock);
        }
        if (lastIdx < allLines.length - 1) {
          const afterBlock = allLines.slice(lastIdx + 1).join('\n').trim();
          if (afterBlock) rawBlocks.push(afterBlock);
        }
      } else {
        // Fall back to original splitting method
        rawBlocks = response.split(/\n\s*\n/).filter(block => block.trim());
      }
    } else {
      // Not sequential, use original splitting method
      rawBlocks = response.split(/\n\s*\n/).filter(block => block.trim());
    }
  } else {
    // Use original splitting method
    rawBlocks = response.split(/\n\s*\n/).filter(block => block.trim());
  }
  
  for (const rawBlock of rawBlocks) {
    const lines = rawBlock.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Check if this block has numbered items
    const hasNumberedItems = lines.some(line => line.match(/^\s*\d+\/\s*/));
    
    if (hasNumberedItems && isValidExpression(lines)) {
      // This is a valid expression block - use StandardResponse
      blocks.push({
        type: 'expression',
        lines: lines,
        rawText: rawBlock
      });
    } else {
      // This is a text/markdown block
      blocks.push({
        type: 'markdown',
        lines: lines,
        rawText: rawBlock
      });
    }
  }
  
  return blocks;
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