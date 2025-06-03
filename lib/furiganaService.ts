// Convert Japanese text with kanji to furigana format using server-side API
export async function addFurigana(japaneseText: string, hiraganaText: string): Promise<string> {
  try {
    const response = await fetch('/api/furigana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ japaneseText }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate furigana');
    }

    const data = await response.json();
    return data.furigana;
  } catch (error) {
    console.error('Error adding furigana:', error);
    // Fallback: return original Japanese text if furigana conversion fails
    return japaneseText;
  }
}

// Check if text contains kanji characters
export function containsKanji(text: string): boolean {
  const kanjiRegex = /[\u4e00-\u9faf]/;
  return kanjiRegex.test(text);
}

// Extract Japanese text from a numbered line (e.g., "1/ こんにちは" -> "こんにちは")
export function extractJapaneseFromLine(line: string): string {
  const match = line.match(/^\s*\d+\/\s*(.*)$/);
  return match ? match[1].trim() : line.trim();
} 