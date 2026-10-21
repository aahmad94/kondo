const THAI_SCRIPT = /[\u0E00-\u0E7F]/;

/** "random", or "random" plus only a difficulty, with no topic phrase. */
const TOPICLESS_RANDOM = /^random(?:\s+(easy|medium|hard))?$/i;

export const THAI_RANDOM_ENGLISH_RETRY =
  'Line 3/ must be the English sentence, not Thai. Regenerate the full response as exactly three lines: 1/ Thai script, 2/ romanization, 3/ the English meaning. Line 3/ must use Latin letters and must not contain Thai script or repeat line 1/.';

export function isTopiclessRandomPrompt(prompt: string): boolean {
  return TOPICLESS_RANDOM.test(prompt.trim());
}

/** Numbered study lines in order, with the "1/ " prefix removed. */
export function numberedStudyLines(result: string): string[] {
  return result
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(\d+)\/\s*(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((match) => match[2].trim());
}

/**
 * Topicless Thai "random" must end with the English sentence.
 * The model sometimes treats the Thai it just invented as the source
 * and copies that sentence onto line 3/.
 */
export function thaiTopiclessRandomMissingEnglish(prompt: string, result: string): boolean {
  if (!isTopiclessRandomPrompt(prompt)) return false;
  const lines = numberedStudyLines(result);
  if (lines.length !== 3) return true;
  const english = lines[2];
  if (!english || THAI_SCRIPT.test(english) || !/[A-Za-z]/.test(english)) return true;
  return false;
}
