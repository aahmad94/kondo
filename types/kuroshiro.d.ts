declare module 'kuroshiro' {
  interface ConvertOptions {
    mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
    to?: 'hiragana' | 'katakana' | 'romaji';
  }

  class Kuroshiro {
    constructor();
    init(analyzer: any): Promise<void>;
    convert(text: string, options?: ConvertOptions): Promise<string>;
  }

  export = Kuroshiro;
}

declare module 'kuroshiro-analyzer-kuromoji' {
  interface KuromojiAnalyzerOptions {
    dictPath?: string;
  }

  class KuromojiAnalyzer {
    constructor(options?: KuromojiAnalyzerOptions);
  }

  export = KuromojiAnalyzer;
} 