/**
 * Email Content Formatting
 * Main module that coordinates between standard response and markdown formatting
 */

import { 
  isStandardResponse, 
  parseStandardResponse, 
  formatStandardResponseHTML,
  formatStandardResponseText,
  type StandardResponseOptions
} from './standardFormat';
import { convertMarkdownToHTML, convertMarkdownToText } from './markdownFormat';

export interface EmailResponse {
  content: string;
}

export interface EmailFormatOptions {
  selectedLanguage?: string;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
}

// Format a single response for HTML email
export function formatResponseHTML(response: EmailResponse, options: EmailFormatOptions = {}): string {
  const isStandard = isStandardResponse(response.content);
  
  let contentHTML = '';
  if (isStandard) {
    // Format as standard response with proper line breaks and language support
    const items = parseStandardResponse(response.content);
    const standardOptions: StandardResponseOptions = {
      selectedLanguage: options.selectedLanguage || 'ja',
      isPhoneticEnabled: options.isPhoneticEnabled !== false, // Default to true
      isKanaEnabled: options.isKanaEnabled !== false // Default to true
    };
    contentHTML = formatStandardResponseHTML(items, standardOptions);
  } else {
    // Format as markdown (typically tables for Dojo content)
    contentHTML = convertMarkdownToHTML(response.content);
  }
  
  return contentHTML;
}

// Format a single response for text email
export function formatResponseText(response: EmailResponse, options: EmailFormatOptions = {}): string {
  const isStandard = isStandardResponse(response.content);
  
  let contentText = '';
  if (isStandard) {
    // Format as standard response with each line on a new line
    const items = parseStandardResponse(response.content);
    contentText = formatStandardResponseText(items);
  } else {
    // Keep original content for non-standard responses
    contentText = convertMarkdownToText(response.content);
  }
  
  return contentText;
}

// Re-export helper functions for backward compatibility
export { isStandardResponse } from './standardFormat';
export { convertMarkdownToHTML } from './markdownFormat';
