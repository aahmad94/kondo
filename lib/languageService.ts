import prisma from './prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
  dojoDetailed: string;
}

const DOJO_INSTRUCTIONS = `
  This tool pulls up to 9 responses across all your bookmarks after 12:00 EST everyday.`

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Japanese.

  Organize and rank material in bookmarks based on how well you know it.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Korean.

  Organize and rank material in bookmarks based on how well you know it.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Spanish.

  Organize and rank material in bookmarks based on how well you know it.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const ARABIC_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Arabic.

  Organize and rank material in bookmarks based on how well you know it.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const CHINESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Chinese.

  Organize and rank material in bookmarks based on how well you know it.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
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