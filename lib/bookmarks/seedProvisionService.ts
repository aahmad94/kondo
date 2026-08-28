import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import {
  DEFAULT_DECK_TITLES,
  SEEDABLE_DECK_TITLES,
  isReservedDeckTitle,
} from './defaultDecks';

const catalogSelect = {
  id: true,
  deckTitle: true,
  sortOrder: true,
  content: true,
  responseType: true,
  rank: true,
  furigana: true,
  breakdown: true,
  mobileBreakdown: true,
} as const;

/**
 * Ensure default decks exist for a user+language and copy SeedResponse
 * catalog rows into per-user GPTResponse copies (source = 'seed').
 * Audio is never loaded or copied — user rows point at SeedResponse via seedResponseId.
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

  try {
    await prisma.bookmark.createMany({
      data: DEFAULT_DECK_TITLES.map((title) => ({
        title,
        userId,
        languageId,
        isReserved: isReservedDeckTitle(title),
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('bookmark createMany skipped (unique index may be missing)', error);
    for (const title of DEFAULT_DECK_TITLES) {
      const found = await prisma.bookmark.findFirst({
        where: { userId, languageId, title },
        select: { id: true },
      });
      if (!found) {
        await prisma.bookmark.create({
          data: {
            title,
            userId,
            languageId,
            isReserved: isReservedDeckTitle(title),
          },
        });
      }
    }
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId, languageId },
    select: { id: true, title: true, seedProvisionedAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const byTitle = new Map<string, (typeof bookmarks)[number]>();
  for (const bookmark of bookmarks) {
    const existing = byTitle.get(bookmark.title);
    if (!existing) {
      byTitle.set(bookmark.title, bookmark);
      continue;
    }
    // Keep the oldest; drop empty duplicates created by raced requests.
    if (!bookmark.seedProvisionedAt) {
      await prisma.bookmark.delete({ where: { id: bookmark.id } }).catch(() => undefined);
    }
  }

  const pendingTitles = SEEDABLE_DECK_TITLES.filter((title) => {
    const bookmark = byTitle.get(title);
    return bookmark && !bookmark.seedProvisionedAt;
  });

  if (pendingTitles.length === 0) {
    return;
  }

  const catalog = await prisma.seedResponse.findMany({
    where: {
      languageId,
      isActive: true,
      deckTitle: { in: [...pendingTitles] },
    },
    select: catalogSelect,
    orderBy: [{ deckTitle: 'asc' }, { sortOrder: 'asc' }],
  });

  const catalogByDeck = new Map<string, typeof catalog>();
  for (const row of catalog) {
    const list = catalogByDeck.get(row.deckTitle) ?? [];
    list.push(row);
    catalogByDeck.set(row.deckTitle, list);
  }

  const now = new Date();

  for (const title of pendingTitles) {
    const bookmark = byTitle.get(title);
    if (!bookmark) continue;

    const seeds = catalogByDeck.get(title) ?? [];
    if (seeds.length === 0) {
      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: { seedProvisionedAt: now },
      });
      continue;
    }

    await prisma.gPTResponse.createMany({
      data: seeds.map((seed) => ({
        content: seed.content,
        responseType: seed.responseType || 'response',
        rank: seed.rank ?? 1,
        furigana: seed.furigana,
        breakdown: seed.breakdown,
        mobileBreakdown: seed.mobileBreakdown,
        source: 'seed',
        seedResponseId: seed.id,
        userId,
        languageId,
        isFuriganaEnabled: isJapanese,
        isPhoneticEnabled: true,
        isKanaEnabled: !isJapanese,
      })),
      skipDuplicates: true,
    });

    const copies = await prisma.gPTResponse.findMany({
      where: {
        userId,
        seedResponseId: { in: seeds.map((seed) => seed.id) },
      },
      select: { id: true },
    });

    if (copies.length > 0) {
      const values = copies.map(
        (copy) => Prisma.sql`(${bookmark.id}, ${copy.id})`
      );
      await prisma.$executeRaw`
        INSERT INTO "_BookmarksToResponses" ("A", "B")
        VALUES ${Prisma.join(values)}
        ON CONFLICT DO NOTHING
      `;
    }

    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: { seedProvisionedAt: now },
    });
  }
}

export async function ensureDefaultBookmarksForAllActiveLanguages(userId: string) {
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (languages.length === 0) {
    return;
  }

  try {
    await prisma.bookmark.createMany({
      data: languages.flatMap((language) =>
        DEFAULT_DECK_TITLES.map((title) => ({
          title,
          userId,
          languageId: language.id,
          isReserved: isReservedDeckTitle(title),
        }))
      ),
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('bookmark createMany skipped (unique index may be missing)', error);
    for (const language of languages) {
      for (const title of DEFAULT_DECK_TITLES) {
        const found = await prisma.bookmark.findFirst({
          where: { userId, languageId: language.id, title },
          select: { id: true },
        });
        if (!found) {
          await prisma.bookmark.create({
            data: {
              title,
              userId,
              languageId: language.id,
              isReserved: isReservedDeckTitle(title),
            },
          });
        }
      }
    }
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
