// Client-safe constants for the "Buy me a coffee" one-time support flow.
// This file MUST NOT import server-only modules (Stripe SDK, Prisma, env).
// It is imported by both the DonateModal (client) and the checkout API route
// (server) so the two share a single source of truth for amounts.

/** Minimum donation: $1.00. Guards against card-testing micro-charges. */
export const MIN_DONATION_CENTS = 100;

/** Maximum donation: $500.00. Sanity cap; larger amounts likely fat-finger/fraud. */
export const MAX_DONATION_CENTS = 50000;

/** Preset amounts shown as quick-pick buttons, in cents. */
export const DONATION_PRESETS_CENTS = [300, 500, 1000, 2500] as const;

/** Default selected preset when the modal opens, in cents ($5). */
export const DEFAULT_DONATION_CENTS = 500;

/** Max length of the optional donor message. */
export const DONATION_MESSAGE_MAX = 140;

/** True when `cents` is a whole-cent integer within the allowed range. */
export function isValidDonationCents(cents: unknown): cents is number {
  return (
    typeof cents === 'number' &&
    Number.isInteger(cents) &&
    cents >= MIN_DONATION_CENTS &&
    cents <= MAX_DONATION_CENTS
  );
}

/** Formats cents as a USD string, e.g. 500 -> "$5". Drops ".00" for whole dollars. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
