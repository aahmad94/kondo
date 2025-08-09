/**
 * Markdown Formatting for Emails
 * Handles markdown content rendering with email-friendly black and white styling
 */

import { marked } from 'marked';

// Helper function to convert markdown to HTML with email-friendly styling
export function convertMarkdownToHTML(content: string): string {
  try {
    const result = marked.parse(content, {
      breaks: true,
      gfm: true
    });
    
    if (typeof result !== 'string') {
      return content;
    }
    
    // Post-process the HTML to add email-friendly inline styles
    const styledHtml = applyEmailStyles(result);
    return styledHtml;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    return content; // Fallback to original content
  }
}

// Apply black and white email-friendly styles to HTML content
function applyEmailStyles(html: string): string {
  return html
    // Style tables
    .replace(/<table>/g, '<table style="border-collapse: separate; border-spacing: 0 8px; width: 100%; margin: 16px 0;">')
    .replace(/<tr>/g, '<tr style="margin-bottom: 4px;">')
    .replace(/<th>/g, '<th style="padding: 8px 12px; line-height: 1.5; font-weight: bold; color: #000;">')
    .replace(/<td>/g, '<td style="padding: 8px 12px; line-height: 1.5; color: #000;">')
    // Style headings
    .replace(/<h1>/g, '<h1 style="color: #000; font-size: 24px; margin: 16px 0 8px 0;">')
    .replace(/<h2>/g, '<h2 style="color: #000; font-size: 20px; margin: 16px 0 8px 0;">')
    .replace(/<h3>/g, '<h3 style="color: #000; font-size: 18px; margin: 16px 0 8px 0;">')
    .replace(/<h4>/g, '<h4 style="color: #000; font-size: 16px; margin: 16px 0 8px 0;">')
    .replace(/<h5>/g, '<h5 style="color: #000; font-size: 14px; margin: 16px 0 8px 0;">')
    .replace(/<h6>/g, '<h6 style="color: #000; font-size: 12px; margin: 16px 0 8px 0;">')
    // Style paragraphs
    .replace(/<p>/g, '<p style="color: #000; margin: 8px 0; line-height: 1.6;">')
    // Style lists
    .replace(/<ul>/g, '<ul style="color: #000; margin: 8px 0; padding-left: 20px;">')
    .replace(/<ol>/g, '<ol style="color: #000; margin: 8px 0; padding-left: 20px;">')
    .replace(/<li>/g, '<li style="color: #000; margin: 4px 0;">')
    // Style links
    .replace(/<a href/g, '<a style="color: #000;" href')
    // Style strong/bold
    .replace(/<strong>/g, '<strong style="color: #000;">')
    .replace(/<b>/g, '<b style="color: #000;">')
    // Style emphasis/italic
    .replace(/<em>/g, '<em style="color: #000;">')
    .replace(/<i>/g, '<i style="color: #000;">');
}

// Helper function to strip markdown and return plain text (for text email version)
export function convertMarkdownToText(content: string): string {
  try {
    // For text emails, we can just return the original markdown content
    // Email clients will display it as plain text
    return content;
  } catch (error) {
    console.error('Error processing markdown for text email:', error);
    return content;
  }
}
