import fs from 'fs';
import path from 'path';
import { normalizeFuriganaHtml } from './furiganaHtml';

function appOrigin(): string {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}

/**
 * The language study prompt tells the model to answer as numbered 1/ 2/ 3/ 4/
 * lines. That prompt must not be the system message here, or the reply is a
 * plain-text study card instead of ruby markup.
 */
export async function generateFuriganaMarkup(japaneseText: string): Promise<string> {
  const promptPath = path.join(process.cwd(), 'prompts', 'furigana_prompt.txt');
  const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

  const response = await fetch(`${appOrigin()}/api/openai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: japaneseText,
      systemPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate furigana');
  }

  const data = await response.json();
  const normalized = normalizeFuriganaHtml(typeof data.result === 'string' ? data.result : '');
  if (!normalized) {
    throw new Error('Furigana model returned an unusable result');
  }
  return normalized;
}
