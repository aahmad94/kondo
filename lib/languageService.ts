import prisma from './prisma';

interface LanguageInstructions {
  main: string;
  dailySummary: string;
}

const JAPANESE_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Japanese; use the **reply button** on a response to get a more detailed breakdown.\n\n 

  **Bookmark features:**
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 inline">
    <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
  </svg> - add response to a bookmark.
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clip-rule="evenodd" />
  </svg>/<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M12 16.28a.75.75 0 01-.53-.22l-7.5-7.5a.75.75 0 011.06-1.06L12 14.47l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-.53.22z" clip-rule="evenodd" />
  </svg> - rank each response in a bookmark.\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/jpn) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Japanese.
  4 - **"alphabet"** - phonetic table of hiragana/katakana and romaji.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
**Daily Response Summary Generator**\n\n
Everyday, this tool creates a new summary at 12:01 AM Eastern Standard Time.\n
A summary includes the following:\n\n

- 1 very familiar response\n\n
- 2 familiar responses\n\n
- 3 less familiar responses

Click the **refresh** button above to manually create a new summary.
`
};

const KOREAN_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Korean; use the **reply button** on a response to get a more detailed breakdown.\n\n 

  **Bookmark features:**
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 inline">
    <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
  </svg> - add response to a bookmark.
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clip-rule="evenodd" />
  </svg>/<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M12 16.28a.75.75 0 01-.53-.22l-7.5-7.5a.75.75 0 011.06-1.06L12 14.47l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-.53.22z" clip-rule="evenodd" />
  </svg> - rank each response in a bookmark.\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/kor) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Korean.
  4 - **"alphabet"** - phonetic table of Hangul and romanization.
  5 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
**Daily Response Summary Generator**\n\n
Everyday, this tool creates a new summary at 12:01 AM Eastern Standard Time.\n
A summary includes the following:\n\n

- 1 very familiar response\n\n
- 2 familiar responses\n\n
- 3 less familiar responses

Click the **refresh** button above to manually create a new summary.
`
};

const SPANISH_INSTRUCTIONS = {
  main: `
  Enter a phrase or sentence to translate into Spanish; use the **reply button** on a response to get a more detailed breakdown.\n\n 

  **Bookmark features:**
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 inline">
    <path fill-rule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
  </svg> - add response to a bookmark.
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clip-rule="evenodd" />
  </svg>/<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 inline">
    <path fill-rule="evenodd" d="M12 16.28a.75.75 0 01-.53-.22l-7.5-7.5a.75.75 0 011.06-1.06L12 14.47l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-.53.22z" clip-rule="evenodd" />
  </svg> - rank each response in a bookmark.\n\n

  **Additional commands:**
  1 - **"random"** + (optional topic) + (optional difficulty level)
  2 - **"verb" +** (eng/esp) **verb** - get a table for all verb tenses.
  3 - **"terms" + topic** - list of related words in Spanish.
  4 - **"asterisk (*)" + question** - inquire about anything else.
`,
  dailySummary: `
**Daily Response Summary Generator**\n\n
Everyday, this tool creates a new summary at 12:01 AM Eastern Standard Time.\n
A summary includes the following:\n\n

- 1 very familiar response\n\n
- 2 familiar responses\n\n
- 3 less familiar responses

Click the **refresh** button above to manually create a new summary.
`
};

const INSTRUCTIONS_BY_LANGUAGE_CODE: Record<string, LanguageInstructions> = {
  ja: JAPANESE_INSTRUCTIONS,
  ko: KOREAN_INSTRUCTIONS,
  es: SPANISH_INSTRUCTIONS,
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