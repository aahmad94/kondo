/**
 * Standard Response Formatting for Emails
 * Handles numbered responses (1/, 2/, 3/, 4/ pattern) like in StandardResponse.tsx
 */

export interface StandardResponseOptions {
  selectedLanguage?: string;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
}

// Helper function to determine if response is a standard response (like in GPTResponse.tsx)
export function isStandardResponse(content: string): boolean {
  const lines = content.split('\n').filter(line => line.trim());
  const numberedLines = lines.filter(line => line.match(/^\s*\d+\/\s*/));
  return [2, 3, 4].includes(numberedLines.length);
}

// Helper function to parse and format standard response content
export function parseStandardResponse(content: string): string[] {
  const lines = content.split('\n').filter(line => line.trim());
  const numberedLines = lines.filter(line => line.match(/^\s*\d+\/\s*/));
  
  // Extract the content from each numbered item (removing the "1/", "2/", etc.)
  return numberedLines.map(line => {
    const match = line.match(/^\s*\d+\/\s*(.*)$/);
    return match ? match[1].trim() : line.trim();
  });
}

// Helper function to get phonetic line index based on language (from StandardResponse.tsx)
function getPhoneticLineIndex(language: string, itemsLength: number): number {
  if (itemsLength < 3) return -1; // No phonetic line for 2-item responses
  
  switch (language) {
    case 'ja': return itemsLength === 4 ? 2 : -1; // 3rd line (index 2) for 4-line Japanese
    case 'zh': return itemsLength >= 3 ? 1 : -1; // 2nd line (index 1) for Chinese
    case 'ko': return itemsLength >= 3 ? 1 : -1; // 2nd line (index 1) for Korean
    case 'ar': return itemsLength === 3 ? 1 : -1; // 2nd line (index 1) for 3-line Arabic
    case 'ur': return itemsLength === 3 ? 1 : -1; // 2nd line (index 1) for 3-line Urdu
    default: return -1;
  }
}

// Helper function to format standard response as HTML with proper styling like StandardResponse.tsx
export function formatStandardResponseHTML(items: string[], options: StandardResponseOptions = {}): string {
  const { selectedLanguage = 'ja', isPhoneticEnabled = true } = options;
  const phoneticLineIndex = getPhoneticLineIndex(selectedLanguage, items.length);
  const isJapaneseFourLine = selectedLanguage === 'ja' && items.length === 4;
  
  let html = '';
  
  // First line - larger text for Japanese 4-line responses, regular for others
  html += `<div style="font-weight:500;margin-bottom:8px;${isJapaneseFourLine ? 'font-size:20px' : 'font-size:18px'}">${items[0]}</div>`;
  
  // Second line logic
  if (items.length === 2) {
    // For 2-item responses, second line is always the native language (styled)
    html += `<div style="display:inline-block;font-size:14px;padding:8px 12px;background:#f0f0f0;margin-bottom:8px">${items[1]}</div>`;
  } else if (items.length === 3) {
    // For 3-item responses, check if line 1 is phonetic
    if (!(phoneticLineIndex === 1 && !isPhoneticEnabled)) {
      html += `<div style="font-size:14px;opacity:0.8;margin-bottom:8px">${items[1]}</div>`;
    }
  } else if (items.length === 4) {
    // For 4-item responses, check if line 1 is phonetic
    if (!(phoneticLineIndex === 1 && !isPhoneticEnabled)) {
      html += `<div style="font-size:14px;opacity:0.8;margin-bottom:8px">${items[1]}</div>`;
    }
  }
  
  // Third line logic
  if (items.length === 3) {
    // For 3-item responses, third line is the native language (styled)
    html += `<div style="display:inline-block;font-size:14px;padding:8px 12px;background:#f0f0f0;margin-bottom:8px">${items[2]}</div>`;
  } else if (items.length === 4) {
    // For 4-item responses, check if line 2 is phonetic
    if (!(phoneticLineIndex === 2 && !isPhoneticEnabled)) {
      html += `<div style="font-size:14px;opacity:0.6;font-style:italic;margin-bottom:8px">${items[2]}</div>`;
    }
  }
  
  // Fourth line - always show as this is native language (for 4 items)
  if (items.length === 4) {
    html += `<div style="display:inline-block;font-size:14px;padding:8px 12px;background:#f0f0f0">${items[3]}</div>`;
  }
  
  return html;
}

// Helper function to format standard response as plain text with line breaks
export function formatStandardResponseText(items: string[]): string {
  return items.join('\n');
}
