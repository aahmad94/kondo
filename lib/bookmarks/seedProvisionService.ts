import prisma from '../database/prisma';
import {
  DEFAULT_DECK_TITLES,
  isReservedDeckTitle,
  isSeedableDeckTitle,
} from './defaultDecks';

/**
 * Ensure default decks exist for a user+language and copy SeedResponse
 * catalog rows into per-user GPTResponse copies (source = 'seed').
 * Audio is not copied — user rows point at SeedResponse via seedResponseId.
 *
 * Idempotent: Bookmark.seedProvisionedAt prevents re-copy after the user
 * deletes seed cards. Safe to call on every signup / language switch.
 */
export async function ensureDefaultDecksAndSeeds(userId: string, languageId: string) {
  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: { id: true, code: true },
  });

  if (!language) {
    console.error(`ensureDefaultDecksAndSeeds: language not found ${languageId}`);
    return;
  }

  const isJapanese = language.code === 'ja';

  const existing = await prisma.bookmark.findMany({
    where: { userId, languageId },
    select: { id: true, title: true, seedProvisionedAt: true },
  });
  const byTitle = new Map(existing.map((bookmark) => [bookmark.title, bookmark]));

  for (const title of DEFAULT_DECK_TITLES) {
    let bookmark = byTitle.get(title);
    if (!bookmark) {
      bookmark = await prisma.bookmark.create({
        data: {
          title,
          userId,
          languageId,
          isReserved: isReservedDeckTitle(title),
        },
        select: { id: true, title: true, seedProvisionedAt: true },
      });
      byTitle.set(title, bookmark);
    }

    if (!isSeedableDeckTitle(title)) {
      continue;
    }

    if (bookmark.seedProvisionedAt) {
      continue;
    }

    const catalog = await prisma.seedResponse.findMany({
      where: {
        languageId,
        deckTitle: title,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (catalog.length === 0) {
      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: { seedProvisionedAt: new Date() },
      });
      continue;
    }

    for (const seed of catalog) {
      try {
        await prisma.gPTResponse.create({
          data: {
            content: seed.content,
            responseType: seed.responseType || 'response',
            rank: seed.rank ?? 1,
            furigana: seed.furigana,
            breakdown: seed.breakdown,
            mobileBreakdown: seed.mobileBreakdown,
            source: 'seed',
            seedResponseId: seed.id,
            isFuriganaEnabled: isJapanese,
            isPhoneticEnabled: true,
            isKanaEnabled: !isJapanese,
            user: { connect: { id: userId } },
            language: { connect: { id: languageId } },
            bookmarks: { connect: { id: bookmark.id } },
          },
        });
      } catch (error: unknown) {
        // Unique (userId, seedResponseId) — already copied for this user
        const code = typeof error === 'object' && error && 'code' in error
          ? (error as { code?: string }).code
          : undefined;
        if (code !== 'P2002') {
          throw error;
        }
      }
    }

    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: { seedProvisionedAt: new Date() },
    });
  }
}

export async function ensureDefaultDecksAndSeedsForAllActiveLanguages(userId: string) {
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const language of languages) {
    await ensureDefaultDecksAndSeeds(userId, language.id);
  }
}
