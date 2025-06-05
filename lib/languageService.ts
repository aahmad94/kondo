import prisma from './prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
}

const DOJO_INSTRUCTIONS = `
  This tool creates material to review daily after 12:00 EST.

  There are 9 responses: 4 hard, 3 medium, 2 easy.
  Click the refresh (🔄) button above to manually generate new material.
  
  Challenge: hide romanization from a response via the dropdown menu.`

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Japanese.

  Organize and rank material in bookmarks based on how well you know it.

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Japanese
  4/ alphabet: phonetic table of hiragana/katakana and romaji
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: DOJO_INSTRUCTIONS
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Korean.

  Organize and rank material in bookmarks based on how well you know it.

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Korean
  4/ alphabet: phonetic table of Hangul and romanization
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: DOJO_INSTRUCTIONS,
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Spanish.

  Organize and rank material in bookmarks based on how well you know it.

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Spanish
  4/ alphabet: phonetic table of Spanish script and romanization
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `This tool creates material to review daily after 12:00 EST.

  There are 9 responses: 4 hard, 3 medium, 2 easy.
  Click the refresh (🔄) button above to manually generate new material.`,
};

const ARABIC_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Arabic.

  Organize and rank material in bookmarks based on how well you know it.

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Arabic
  4/ alphabet: phonetic table of Arabic script and romanization
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: DOJO_INSTRUCTIONS,
};

const CHINESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Chinese.

  Organize and rank material in bookmarks based on how well you know it.

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Chinese
  4/ alphabet + (optional # or range): table of common Chinese characters
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: DOJO_INSTRUCTIONS,
};

const INSTRUCTIONS_BY_LANGUAGE_CODE: Record<string, LanguageInstructions> = {
  ja: JAPANESE_INSTRUCTIONS,
  ko: KOREAN_INSTRUCTIONS,
  es: SPANISH_INSTRUCTIONS,
  ar: ARABIC_INSTRUCTIONS,
  zh: CHINESE_INSTRUCTIONS
};

export async function getLanguageInstructions(userId: string, languageCode?: string): Promise<LanguageInstructions> {
  try {
    // If language code is provided, use it directly
    if (languageCode) {
      return INSTRUCTIONS_BY_LANGUAGE_CODE[languageCode] || JAPANESE_INSTRUCTIONS;
    }

    // Otherwise, get user's language preference from database
    const preference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      include: {
        language: true
      }
    });

    // If no preference is set or language not found, default to Japanese
    const code = preference?.language?.code || 'ja';
    return INSTRUCTIONS_BY_LANGUAGE_CODE[code] || JAPANESE_INSTRUCTIONS;
  } catch (error) {
    console.error('Error getting language instructions:', error);
    return JAPANESE_INSTRUCTIONS;
  }
} 