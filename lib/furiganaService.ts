// Server-side furigana service using API calls

export async function addFurigana(japaneseText: string, hiraganaText?: string, responseId?: string): Promise<string> {
  try {
    const response = await fetch('/api/furigana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        japaneseText: japaneseText,
        responseId: responseId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.furigana;
  } catch (error) {
    console.error('Error calling furigana API:', error);
    throw error;
  }
}

// Check if text contains kanji characters (Unicode range for CJK Unified Ideographs)
export function containsKanji(text: string): boolean {
  const kanjiRegex = /[\u4e00-\u9faf]/;
  return kanjiRegex.test(text);
}

// Extract Japanese text from a line, removing any numbering or formatting
export function extractJapaneseFromLine(line: string): string {
  const match = line.match(/^\s*\d+\/\s*(.*)$/);
  return match ? match[1].trim() : line.trim();
} 