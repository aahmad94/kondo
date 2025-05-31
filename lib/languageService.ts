import prisma from './prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
}

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Japanese/
  Use the light bulb (💡) on a response to get a more detailed breakdown.\n\n

  Bookmark features:
  ➕ add response to a bookmark
  ⬆️ ⬇️ rank each response in a bookmark\n\n

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Japanese
  4/ alphabet: phonetic table of hiragana/katakana and romaji
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `
This tool creates a new report (3 hard, 2 medium, 1 easy) daily at 12:01 AM EST.

Click the **refresh** button above to manually create a new report.
`
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Korean.
  Use the light bulb (💡) on a response to get a more detailed breakdown.\n\n

  Bookmark features:
  ➕ add response to a bookmark
  ⬆️ ⬇️ rank each response in a bookmark\n\n

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Korean
  4/ alphabet: phonetic table of Hangul and romanization
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `
This tool creates a new report (3 hard, 2 medium, 1 easy) daily at 12:01 AM EST.

Click the **refresh** button above to manually create a new report.
`
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Spanish.
  Use the light bulb (💡) on a response to get a more detailed breakdown.\n\n 

  Bookmark features:
  ➕ add response to a bookmark
  ⬆️ ⬇️ rank each response in a bookmark\n\n

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Spanish
  4/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `
This tool creates a new report (3 hard, 2 medium, 1 easy) daily at 12:01 AM EST.

Click the **refresh** button above to manually create a new report.
`
};

const ARABIC_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Arabic.
  Use the light bulb (💡) on a response to get a more detailed breakdown.\n\n 

  Bookmark features:
  ➕ add response to a bookmark
  ⬆️ ⬇️ rank each response in a bookmark\n\n

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Arabic
  4/ alphabet: phonetic table of Arabic script and romanization
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `
This tool creates a new report (3 hard, 2 medium, 1 easy) daily at 12:01 AM EST.

Click the **refresh** button above to manually create a new report.
`
};

const CHINESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Chinese.
  Use the light bulb (💡) on a response to get a more detailed breakdown.\n\n 

  Bookmark features:
  ➕ add response to a bookmark
  ⬆️ ⬇️ rank each response in a bookmark\n\n

  Additional commands:
  1/ random + (optional topic) + (optional difficulty level)
  2/ verb + (verb): get a table for all verb tenses
  3/ terms + (topic): list of related words in Chinese
  4/ alphabet: table of common Chinese characters
  5/ asterisk (*) + (question): inquire about anything else
`,
  dailySummary: `
This tool creates a new report (3 hard, 2 medium, 1 easy) daily at 12:01 AM EST.

Click the **refresh** button above to manually create a new report.
`
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