import prisma from '../database/prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
  dojoDetailed: string;
}

const DOJO_INSTRUCTIONS = `
  This tool aggregates responses across all your bookmarks daily, prioritizing those that are lower ranked.`

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate to Japanese — view additional AI commands in the toolbar above.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate to Korean — view additional AI commands in the toolbar above.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate to Spanish — view additional AI commands in the toolbar above.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const ARABIC_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate to Arabic — view additional AI commands in the toolbar above.
`,
  dailySummary: DOJO_INSTRUCTIONS,
  dojoDetailed: ''
};

const CHINESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate to Chinese — view additional AI commands in the toolbar above.

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

/**
 * Gets user's preferred language ID, with fallback to Japanese
 */
export async function getUserLanguageId(userId: string): Promise<string> {
  try {
    // Get user's language preference
    const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      select: { languageId: true }
    });

    // If preference exists, return it
    if (userLanguagePreference?.languageId) {
      return userLanguagePreference.languageId;
    }

    // If no preference is set, get the Japanese language ID
    const japanese = await prisma.language.findUnique({
      where: { code: 'ja' },
      select: { id: true }
    });

    if (!japanese?.id) {
      throw new Error('Default language (Japanese) not found in database');
    }

    return japanese.id;
  } catch (error) {
    console.error('Error getting user language ID:', error);
    throw error;
  }
}

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