import { Prisma } from '@prisma/client';
import prisma from '../database/prisma';
import {
  DEFAULT_DECK_TITLES,
  SEEDABLE_DECK_TITLES,
  canonicalDefaultTitle,
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

type DeckRow = {
  id: string;
  title: string;
  seedProvisionedAt: Date | null;
  createdAt: Date;
};

async function loadUserLanguageDecks(userId: string, languageId: string): Promise<DeckRow[]> {
  return prisma.bookmark.findMany({
    where: { userId, languageId },
    select: { id: true, title: true, seedProvisionedAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

function presentDefaultTitles(decks: DeckRow[]): Set<string> {
  const present = new Set<string>();
  for (const deck of decks) {
    const canonical = canonicalDefaultTitle(deck.title);
    if (canonical) present.add(canonical);
  }
  return present;
}

/**
 * Move cards (and community-import pointers) from a duplicate default deck
 * onto the original, then delete the duplicate. GPTResponse rows are kept;
 * only the join / bookmark row goes away.
 */
async function absorbExtraDeck(keeperId: string, extraId: string) {
  if (keeperId === extraId) return;

  const extra = await prisma.bookmark.findUnique({
    where: { id: extraId },
    select: { responses: { select: { id: true } } },
  });
  if (!extra) return;

  if (extra.responses.length > 0) {
    await prisma.bookmark.update({
      where: { id: keeperId },
      data: {
        responses: { connect: extra.responses.map((response) => ({ id: response.id })) },
      },
    });
  }

  try {
    await prisma.communityImport.updateMany({
      where: { importedBookmarkId: extraId },
      data: { importedBookmarkId: keeperId },
    });
  } catch {
    await prisma.communityImport.deleteMany({
      where: { importedBookmarkId: extraId },
    });
  }

  await prisma.bookmark.delete({ where: { id: extraId } }).catch(() => undefined);
}

/**
 * For each canonical default title, keep the oldest deck and fold later
 * copies (empty shells from the old signup flow, or already-seeded extras)
 * into it so seed cards land on the original bookmark.
 */
async function collapseDefaultDeckDuplicates(decks: DeckRow[]): Promise<Map<string, DeckRow>> {
  const groups = new Map<string, DeckRow[]>();
  for (const deck of decks) {
    const canonical = canonicalDefaultTitle(deck.title);
    if (!canonical) continue;
    const list = groups.get(canonical) ?? [];
    list.push(deck);
    groups.set(canonical, list);
  }

  const keepers = new Map<string, DeckRow>();
  for (const [canonical, group] of groups) {
    group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keeper = group[0];
    keepers.set(canonical, keeper);
    for (const extra of group.slice(1)) {
      await absorbExtraDeck(keeper.id, extra.id);
    }
  }
  return keepers;
}

async function createMissingDefaultDecks(
  userId: string,
  languageId: string,
  missingTitles: readonly string[]
) {
  if (missingTitles.length === 0) return;

  const data = missingTitles.map((title) => ({
    title,
    userId,
    languageId,
    isReserved: isReservedDeckTitle(title),
  }));

  try {
    await prisma.bookmark.createMany({
      data,
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('bookmark createMany skipped (unique index may be missing)', error);
    for (const row of data) {
      const found = await prisma.bookmark.findFirst({
        where: { userId, languageId, title: row.title },
        select: { id: true },
      });
      if (!found) {
        await prisma.bookmark.create({ data: row });
      }
    }
  }
}

/**
 * Ensure default decks exist for a user+language and copy SeedResponse
 * catalog rows into per-user GPTResponse copies (source = 'seed').
 * Audio is never loaded or copied — user rows point at SeedResponse via seedResponseId.
 *
 * Reuses an existing deck with the same title (from the old empty-default
 * signup flow) instead of creating a second copy. Duplicate titles are
 * folded onto the oldest bookmark so seed cards attach there.
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

  const existing = await loadUserLanguageDecks(userId, languageId);
  const present = presentDefaultTitles(existing);
  const missingTitles = DEFAULT_DECK_TITLES.filter((title) => !present.has(title));
  await createMissingDefaultDecks(userId, languageId, missingTitles);

  const decks = missingTitles.length > 0
    ? await loadUserLanguageDecks(userId, languageId)
    : existing;
  const byTitle = await collapseDefaultDeckDuplicates(decks);

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

  const existing = await prisma.bookmark.findMany({
    where: {
      userId,
      languageId: { in: languages.map((language) => language.id) },
    },
    select: { languageId: true, title: true },
  });

  const existingKeys = new Set(
    existing.map((bookmark) => `${bookmark.languageId}:${bookmark.title.trim().toLowerCase()}`)
  );

  const toCreate = languages.flatMap((language) =>
    DEFAULT_DECK_TITLES
      .filter((title) => !existingKeys.has(`${language.id}:${title}`))
      .map((title) => ({
        title,
        userId,
        languageId: language.id,
        isReserved: isReservedDeckTitle(title),
      }))
  );

  if (toCreate.length === 0) {
    return;
  }

  try {
    await prisma.bookmark.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  } catch (error) {
    console.warn('bookmark createMany skipped (unique index may be missing)', error);
    for (const row of toCreate) {
      const found = await prisma.bookmark.findFirst({
        where: { userId, languageId: row.languageId, title: row.title },
        select: { id: true },
      });
      if (!found) {
        await prisma.bookmark.create({ data: row });
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
