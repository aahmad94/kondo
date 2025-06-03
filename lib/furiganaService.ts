import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let kuroshiro: Kuroshiro | null = null;
let initializationPromise: Promise<Kuroshiro> | null = null;

// Initialize Kuroshiro instance (singleton pattern with shared promise)
async function initKuroshiro(): Promise<Kuroshiro> {
  if (kuroshiro) {
    return kuroshiro;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    kuroshiro = new Kuroshiro();
    
    // Try different dictionary paths for different environments
    const dictPaths = [
      "/node_modules/kuromoji/dict/", // Original path for local development
      "./node_modules/kuromoji/dict/", // Relative path
      "/public/node_modules/kuromoji/dict/", // Public directory path
      undefined // Let kuromoji use default path
    ];
    
    let lastError: Error | null = null;
    
    for (const dictPath of dictPaths) {
      try {
        console.log(`Attempting to initialize Kuroshiro with dictPath: ${dictPath || 'default'}`);
        await kuroshiro.init(new KuromojiAnalyzer(dictPath ? { dictPath } : {}));
        console.log(`Successfully initialized Kuroshiro with dictPath: ${dictPath || 'default'}`);
        return kuroshiro;
      } catch (error) {
        console.warn(`Failed to initialize with dictPath ${dictPath || 'default'}:`, error);
        lastError = error as Error;
        continue;
      }
    }
    
    // If all paths failed, throw the last error
    throw new Error(`Failed to initialize Kuroshiro with any dictionary path. Last error: ${lastError?.message}`);
  })();

  return initializationPromise;
}

// Convert Japanese text with kanji to furigana format
export async function addFurigana(japaneseText: string, hiraganaText: string): Promise<string> {
  try {
    const kuroshiroInstance = await initKuroshiro();
    
    // Use Kuroshiro to convert the Japanese text to furigana format
    const furiganaResult = await kuroshiroInstance.convert(japaneseText, {
      mode: 'furigana',
      to: 'hiragana'
    });
    
    return furiganaResult;
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

// Preload Kuroshiro for better performance
export async function preloadKuroshiro(): Promise<void> {
  try {
    await initKuroshiro();
  } catch (error) {
    console.error('Error preloading Kuroshiro:', error);
  }
} 