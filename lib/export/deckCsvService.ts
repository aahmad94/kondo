/**
 * Deck CSV Export
 *
 * Turns a deck's GPT responses into a flat CSV. Audio (and its mime type) is
 * deliberately left out — it is base64 blob data and useless in a spreadsheet.
 * Everything else the user has actually loaded for a response comes along:
 * the parsed lines of the phrase, furigana, breakdown, and notes.
 */

import prisma from '../database/prisma';
import { isStandardResponse, parseStandardResponse } from '../email/standardFormat';
import { getUserLanguageId } from '../user/languageService';

export interface DeckCsvResponse {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  rank: number | null;
  isPaused: boolean;
  responseType: string;
  source: string;
  furigana: string | null;
  breakdown: string | null;
  mobileBreakdown: string | null;
  note: string | null;
}

/** A response paired with the deck label it should be reported under. */
export interface DeckCsvRow extends DeckCsvResponse {
  deck: string;
}

export interface DeckCsvExport {
  csv: string;
  filename: string;
}

export const DECK_CSV_HEADERS = [
  'response_id',
  'deck',
  'language_code',
  'language_name',
  'created_at',
  'updated_at',
  'rank',
  'is_paused',
  'response_type',
  'source',
  'expression',
  'reading',
  'phonetic',
  'translation',
  'furigana',
  'breakdown',
  'note',
  'raw_content',
] as const;

/**
 * Index of the phonetic (romanization) line for a language, mirroring
 * StandardResponse.tsx. -1 means the language has no dedicated phonetic line.
 */
function getPhoneticLineIndex(language: string, itemsLength: number): number {
  if (itemsLength < 3) return -1;

  switch (language) {
    case 'ja': return itemsLength === 4 ? 2 : -1;
    case 'zh': return itemsLength >= 3 ? 1 : -1;
    case 'ko': return itemsLength >= 3 ? 1 : -1;
    case 'ar': return itemsLength === 3 ? 1 : -1;
    case 'ur': return itemsLength === 3 ? 1 : -1;
    default: return -1;
  }
}

export interface ParsedResponseLines {
  expression: string;
  reading: string;
  phonetic: string;
  translation: string;
}

/**
 * Splits a standard (numbered) response into its named lines. Non-standard
 * responses — dojo markdown tables, instructions — return empty lines and are
 * carried by the raw_content column instead.
 */
export function parseResponseLines(content: string, languageCode: string): ParsedResponseLines {
  const empty = { expression: '', reading: '', phonetic: '', translation: '' };

  if (!isStandardResponse(content)) return empty;

  const items = parseStandardResponse(content);
  if (items.length === 0) return empty;

  const phoneticIndex = getPhoneticLineIndex(languageCode, items.length);
  // The last line is always the native-language translation.
  const translationIndex = items.length - 1;
  // Japanese 4-line responses put the kana reading on line 2.
  const readingIndex = languageCode === 'ja' && items.length === 4 ? 1 : -1;

  return {
    expression: items[0] ?? '',
    reading: readingIndex >= 0 ? items[readingIndex] ?? '' : '',
    phonetic: phoneticIndex >= 0 ? items[phoneticIndex] ?? '' : '',
    translation: translationIndex > 0 ? items[translationIndex] ?? '' : '',
  };
}

/**
 * Escapes one CSV field. Also neutralizes leading characters that spreadsheet
 * apps treat as the start of a formula — response content is model-generated
 * and can be imported from the community feed, so it isn't trusted input.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  let field = String(value);

  if (/^[=+\-@\t\r]/.test(field)) {
    field = `'${field}`;
  }

  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}

export function toCsv(headers: readonly string[], rows: unknown[][]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','));
  }
  return lines.join('\r\n');
}

/**
 * Builds a filesystem-friendly name like `kondo-vocabulary-2026-07-29.csv`.
 */
export function buildCsvFilename(deckTitle: string, date: Date = new Date()): string {
  const slug = deckTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'deck';
  const day = date.toISOString().slice(0, 10);
  return `kondo-${slug}-${day}.csv`;
}

export function buildResponsesCsv(
  languageCode: string,
  languageName: string,
  responses: DeckCsvRow[]
): string {
  const rows = responses.map(response => {
    const lines = parseResponseLines(response.content, languageCode);

    return [
      response.id,
      response.deck,
      languageCode,
      languageName,
      response.createdAt.toISOString(),
      response.updatedAt.toISOString(),
      response.rank ?? '',
      response.isPaused,
      response.responseType,
      response.source,
      lines.expression,
      lines.reading,
      lines.phonetic,
      lines.translation,
      response.furigana ?? '',
      // Mobile-only users have their breakdown stored in mobileBreakdown.
      response.breakdown || response.mobileBreakdown || '',
      response.note ?? '',
      response.content,
    ];
  });

  return toCsv(DECK_CSV_HEADERS, rows);
}

/**
 * Loads a deck the user owns and renders every response in it as CSV.
 * Returns null when the deck doesn't exist or belongs to someone else.
 */
export async function exportDeckToCsv(userId: string, deckId: string): Promise<DeckCsvExport | null> {
  const deck = await prisma.bookmark.findFirst({
    where: {
      id: deckId,
      userId: userId,
    },
    select: {
      id: true,
      title: true,
      languageId: true,
      language: {
        select: { code: true, name: true },
      },
    },
  });

  if (!deck) return null;

  const responses = await prisma.gPTResponse.findMany({
    where: {
      bookmarks: {
        some: { id: deck.id },
      },
      languageId: deck.languageId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      rank: true,
      isPaused: true,
      responseType: true,
      source: true,
      furigana: true,
      breakdown: true,
      mobileBreakdown: true,
      note: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = responses.map(response => ({ ...response, deck: deck.title }));

  return {
    csv: buildResponsesCsv(deck.language.code, deck.language.name, rows),
    filename: buildCsvFilename(deck.title),
  };
}

/**
 * Renders every response the user has in their current language, across all
 * decks — this backs the "all responses" view, which has no bookmark row of
 * its own. Responses can sit in more than one deck, so the deck column lists
 * all of them; loose responses in no deck get an empty deck cell.
 */
export async function exportAllResponsesToCsv(userId: string): Promise<DeckCsvExport> {
  const languageId = await getUserLanguageId(userId);

  const [language, responses] = await Promise.all([
    prisma.language.findUnique({
      where: { id: languageId },
      select: { code: true, name: true },
    }),
    prisma.gPTResponse.findMany({
      where: {
        userId: userId,
        languageId: languageId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        rank: true,
        isPaused: true,
        responseType: true,
        source: true,
        furigana: true,
        breakdown: true,
        mobileBreakdown: true,
        note: true,
        bookmarks: {
          select: { title: true },
          orderBy: { title: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const rows = responses.map(({ bookmarks, ...response }) => ({
    ...response,
    deck: bookmarks.map(bookmark => bookmark.title).join('; '),
  }));

  return {
    csv: buildResponsesCsv(language?.code ?? '', language?.name ?? '', rows),
    filename: buildCsvFilename('all-responses'),
  };
}
