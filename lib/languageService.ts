import prisma from './prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
}

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Japanese; use the **reply button** on a response to get a more detailed breakdown.\n\n 
  
  **Response features:**
  💡 - breakdown response
  💬 - quote response in input field

  **Bookmark features:**
  ➕ - add response to a bookmark
  ⬆️/⬇️ - rank each response in a bookmark\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/jpn) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Japanese.
  4 - **"alphabet"** - phonetic table of hiragana/katakana and romaji.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
Everyday, this tool creates a new report (3 easy, 2 medium, 1 easy) at 12:01 AM Eastern Standard Time.

Click the 🔄 button above to manually create a new report.
`
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Korean; use the **reply button** on a response to get a more detailed breakdown.\n\n 
  
  **Response features:**
  💡 - breakdown response
  💬 - quote response in input field

  **Bookmark features:**
  ➕ - add response to a bookmark
  ⬆️/⬇️ - rank each response in a bookmark\n\n


  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/kor) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Korean.
  4 - **"alphabet"** - phonetic table of Hangul and romanization.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
Everyday, this tool creates a new report (3 easy, 2 medium, 1 easy) at 12:01 AM Eastern Standard Time.

Click the 🔄 button above to manually create a new report.
`
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Spanish; use the **reply button** on a response to get a more detailed breakdown.\n\n 
  
  **Response features:**
  💡 - breakdown response
  💬 - quote response in input field
  
  **Bookmark features:**
  ➕ - add response to a bookmark
  ⬆️/⬇️ - rank each response in a bookmark\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/esp) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Spanish.
  4 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
Everyday, this tool creates a new report (3 easy, 2 medium, 1 easy) at 12:01 AM Eastern Standard Time.

Click the 🔄 button above to manually create a new report.
`
};

const ARABIC_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Arabic; use the **reply button** on a response to get a more detailed breakdown.\n\n 
  
  **Response features:**
  💡 - breakdown response
  💬 - quote response in input field

  **Bookmark features:**
  ➕ - add response to a bookmark
  ⬆️/⬇️ - rank each response in a bookmark\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/ar) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Arabic.
  4 - **"alphabet"** - phonetic table of Arabic script and romanization.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
Everyday, this tool creates a new report (3 easy, 2 medium, 1 easy) at 12:01 AM Eastern Standard Time.

Click the 🔄 button above to manually create a new report.
`
};

const INSTRUCTIONS_BY_LANGUAGE_CODE: Record<string, LanguageInstructions> = {
  ja: JAPANESE_INSTRUCTIONS,
  ko: KOREAN_INSTRUCTIONS,
  es: SPANISH_INSTRUCTIONS,
  ar: ARABIC_INSTRUCTIONS
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