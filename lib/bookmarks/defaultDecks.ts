/**
 * Canonical default decks created for every user × language.
 * Used on signup (all active languages) and on language switch
 * (ensure each title exists; create missing ones).
 *
 * Seed content targets: travel, counting, alphabet, verbs, introductions.
 * `daily summary` is reserved/system and stays empty of seed cards.
 *
 * When seed catalog ships: copy SeedResponse → GPTResponse with source='seed'
 * (not shareable to community). See temp-sql/IMPLEMENTATION-PLAN.md.
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
