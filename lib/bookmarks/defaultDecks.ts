/**
 * Canonical default decks created for every user × language.
 * Used on signup (all active languages) and when a language has no decks yet
 * (language preference switch).
 *
 * Seed content targets: travel, counting, alphabet, verbs, introductions.
 * `daily summary` is reserved/system and stays empty of seed cards.
 */
export const DEFAULT_DECK_TITLES = [
  'travel',
  'counting',
  'alphabet',
  'verbs',
  'introductions',
  'daily summary',
] as const;

export type DefaultDeckTitle = (typeof DEFAULT_DECK_TITLES)[number];

/** Deck titles that cannot be deleted / are system-managed */
export const RESERVED_DECK_TITLES = ['daily summary', 'all responses'] as const;

export function isReservedDeckTitle(title: string): boolean {
  return (RESERVED_DECK_TITLES as readonly string[]).includes(title);
}
