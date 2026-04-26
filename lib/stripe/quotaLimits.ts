// Client-safe constants and types for quota/subscription handling.
// This file MUST NOT import server-only modules (Stripe SDK, Prisma, env-dependent clients).
// It is safe to import from client components.

export const FREE_LIMITS = {
  RESPONSES_PER_WEEK: 10,
  BREAKDOWNS_PER_DAY: 5,
  TTS_PER_DAY: 5,
  VOICE_CHATS_PER_WEEK: 5,
} as const;

export type QuotaType = 'responses' | 'breakdowns' | 'tts' | 'voice';

export interface QuotaResult {
  allowed: boolean;
  isPremium: boolean;
  current: number;
  limit: number;
  remaining: number;
}
