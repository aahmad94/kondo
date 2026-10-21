import 'server-only';
import prisma from '../database/prisma';
import { generateFuriganaMarkup } from '../utils/furiganaGenerate';
import { normalizeFuriganaHtml } from '../utils/furiganaHtml';

/**
 * Gets or generates furigana for a community response with caching
 */
export async function getCommunityFurigana(
  communityResponseId: string,
  japaneseText: string
) {
  if (!communityResponseId) {
    throw new Error('Community response ID is required');
  }

  if (!japaneseText) {
    throw new Error('Japanese text is required');
  }

  try {
    // First, check if we already have the furigana cached
    const existingCommunityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      select: { 
        furigana: true
      }
    });

    if (!existingCommunityResponse) {
      throw new Error('Community response not found');
    }

    // Cached study-card text is not renderable ruby. Regenerate those rows.
    const normalized = existingCommunityResponse.furigana
      ? normalizeFuriganaHtml(existingCommunityResponse.furigana)
      : null;
    if (normalized) {
      console.log(`Returning cached furigana for community response ${communityResponseId}`);
      return { furigana: normalized };
    }

    const furiganaResult = await generateFuriganaMarkup(japaneseText);

    // Update the community response with the new furigana
    await prisma.communityResponse.update({
      where: { id: communityResponseId },
      data: {
        furigana: furiganaResult
      }
    });

    console.log(`Cached furigana for community response ${communityResponseId}`);

    return {
      furigana: furiganaResult
    };
  } catch (error) {
    console.error('Error getting community furigana:', error);
    throw error;
  }
}


