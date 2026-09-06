/**
 * Shared model id for text generation (chat, breakdowns, furigana).
 * Chat completions go through OpenAI via pages/api/openai.ts.
 */

/** Default model for study content, breakdowns, and reading aids. */
export const DEFAULT_LLM_MODEL = 'gpt-4o';
