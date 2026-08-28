// npx tsx scripts/load-seed-catalog.mts
// Copies Adeel's source GPTResponse rows into the SeedResponse catalog.
// Audio stays on the catalog (not copied onto users). Idempotent upsert.

import { PrismaClient } from '@prisma/client';
import { SEED_CATALOG_SOURCE_IDS } from '../lib/bookmarks/seedCatalogIds';

const prisma = new PrismaClient();

async function main() {
  let upserted = 0;
  let missing = 0;

  for (const [languageCode, decks] of Object.entries(SEED_CATALOG_SOURCE_IDS)) {
    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true, code: true },
    });

    if (!language) {
      console.error(`Language not found: ${languageCode}`);
      continue;
    }

    for (const [deckTitle, sourceIds] of Object.entries(decks)) {
      for (let sortOrder = 0; sortOrder < sourceIds.length; sortOrder++) {
        const sourceResponseId = sourceIds[sortOrder];
        const source = await prisma.gPTResponse.findUnique({
          where: { id: sourceResponseId },
          select: {
            content: true,
            responseType: true,
            rank: true,
            furigana: true,
            breakdown: true,
            mobileBreakdown: true,
            audio: true,
            audioMimeType: true,
          },
        });

        if (!source) {
          console.warn(`Missing source GPTResponse ${sourceResponseId} (${languageCode}/${deckTitle} #${sortOrder})`);
          missing += 1;
          continue;
        }

        await prisma.seedResponse.upsert({
          where: {
            languageId_deckTitle_sortOrder: {
              languageId: language.id,
              deckTitle,
              sortOrder,
            },
          },
          create: {
            languageId: language.id,
            deckTitle,
            sortOrder,
            content: source.content,
            responseType: source.responseType || 'response',
            rank: source.rank ?? 1,
            furigana: source.furigana,
            breakdown: source.breakdown,
            mobileBreakdown: source.mobileBreakdown,
            audio: source.audio,
            audioMimeType: source.audioMimeType,
            sourceResponseId,
            isActive: true,
          },
          update: {
            content: source.content,
            responseType: source.responseType || 'response',
            rank: source.rank ?? 1,
            furigana: source.furigana,
            breakdown: source.breakdown,
            mobileBreakdown: source.mobileBreakdown,
            audio: source.audio,
            audioMimeType: source.audioMimeType,
            sourceResponseId,
            isActive: true,
          },
        });
        upserted += 1;
      }
    }
    console.log(`Loaded catalog for ${languageCode}`);
  }

  console.log(`Seed catalog load complete. upserted=${upserted} missing=${missing}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
