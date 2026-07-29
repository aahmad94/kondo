import {
  escapeCsvField,
  toCsv,
  parseResponseLines,
  buildCsvFilename,
  buildResponsesCsv,
  DECK_CSV_HEADERS,
  type DeckCsvRow,
} from '@/lib/export/deckCsvService';

const baseResponse = (overrides: Partial<DeckCsvRow> = {}): DeckCsvRow => ({
  id: 'resp_1',
  deck: 'vocabulary',
  content: '1/ 木漏れ日\n2/ こもれび\n3/ komorebi\n4/ Sunlight filtering through trees.',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
  updatedAt: new Date('2026-07-02T12:00:00.000Z'),
  rank: 1,
  isPaused: false,
  responseType: 'response',
  source: 'local',
  furigana: null,
  breakdown: null,
  mobileBreakdown: null,
  note: null,
  ...overrides,
});

describe('escapeCsvField', () => {
  it('returns empty string for null and undefined', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('leaves plain values untouched', () => {
    expect(escapeCsvField('komorebi')).toBe('komorebi');
    expect(escapeCsvField(3)).toBe('3');
    expect(escapeCsvField(false)).toBe('false');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralizes spreadsheet formula prefixes', () => {
    expect(escapeCsvField('=1+1')).toBe("'=1+1");
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvField('-2+3')).toBe("'-2+3");
  });
});

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x'], [2, 'y,z']])).toBe('a,b\r\n1,x\r\n2,"y,z"');
  });
});

describe('parseResponseLines', () => {
  it('parses a Japanese 4-line response', () => {
    expect(parseResponseLines(baseResponse().content, 'ja')).toEqual({
      expression: '木漏れ日',
      reading: 'こもれび',
      phonetic: 'komorebi',
      translation: 'Sunlight filtering through trees.',
    });
  });

  it('parses a 3-line response with a phonetic line', () => {
    const content = '1/ 你好\n2/ nǐ hǎo\n3/ Hello';
    expect(parseResponseLines(content, 'zh')).toEqual({
      expression: '你好',
      reading: '',
      phonetic: 'nǐ hǎo',
      translation: 'Hello',
    });
  });

  it('parses a 2-line response as expression plus translation', () => {
    const content = '1/ Hola\n2/ Hello';
    expect(parseResponseLines(content, 'es')).toEqual({
      expression: 'Hola',
      reading: '',
      phonetic: '',
      translation: 'Hello',
    });
  });

  it('returns empty lines for non-standard (markdown) content', () => {
    const content = '| word | meaning |\n| --- | --- |\n| 犬 | dog |';
    expect(parseResponseLines(content, 'ja')).toEqual({
      expression: '',
      reading: '',
      phonetic: '',
      translation: '',
    });
  });
});

describe('buildCsvFilename', () => {
  it('slugifies the deck title and appends the date', () => {
    expect(buildCsvFilename('My Vocabulary!', new Date('2026-07-29T00:00:00.000Z')))
      .toBe('kondo-my-vocabulary-2026-07-29.csv');
  });

  it('falls back to "deck" when the title has no usable characters', () => {
    expect(buildCsvFilename('日本語', new Date('2026-07-29T00:00:00.000Z')))
      .toBe('kondo-deck-2026-07-29.csv');
  });
});

describe('buildResponsesCsv', () => {
  it('emits a header row plus one row per response', () => {
    const csv = buildResponsesCsv('ja', 'Japanese', [baseResponse()]);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe(DECK_CSV_HEADERS.join(','));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('木漏れ日');
    expect(lines[1]).toContain('2026-07-01T12:00:00.000Z');
    expect(lines[1]).toContain('Japanese');
    expect(lines[1]).toContain('vocabulary');
  });

  it('quotes a multi-deck label so the semicolon list stays in one cell', () => {
    const csv = buildResponsesCsv('ja', 'Japanese', [
      baseResponse({ deck: 'vocabulary; travel' }),
    ]);

    expect(csv).toContain('vocabulary; travel');
    // No comma in the label, so it needs no quoting — but it must not split.
    expect(csv.split('\r\n')[1].split(',')[1]).toBe('vocabulary; travel');
  });

  it('falls back to the mobile breakdown when only that was loaded', () => {
    const csv = buildResponsesCsv('ja', 'Japanese', [
      baseResponse({ breakdown: null, mobileBreakdown: 'mobile breakdown text' }),
    ]);

    expect(csv).toContain('mobile breakdown text');
  });

  it('omits audio columns entirely', () => {
    expect(DECK_CSV_HEADERS).not.toContain('audio');
    expect(DECK_CSV_HEADERS).not.toContain('audio_mime_type');
  });
});
