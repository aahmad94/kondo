import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';
import { getCommunityFurigana } from '@/lib/community';
import { generateFuriganaMarkup } from '@/lib/utils/furiganaGenerate';
import { normalizeFuriganaArray, normalizeFuriganaHtml } from '@/lib/utils/furiganaHtml';

/**
 * Helper function to generate furigana for multiple expression blocks in a clarification
 */
async function handleClarificationFurigana(
  blocks: Array<{ japaneseText: string; hiraganaText: string }>,
  responseId: string | undefined,
  res: NextApiResponse
) {
  // Check cache first if responseId provided
  if (responseId && responseId !== 'null' && responseId !== 'undefined' && !responseId.includes('temp') && !responseId.includes('block')) {
    try {
      const [communityResponse, gptResponse] = await Promise.all([
        prisma.communityResponse.findUnique({
          where: { id: responseId },
          select: { furigana: true, responseType: true }
        }),
        prisma.gPTResponse.findUnique({
          where: { id: responseId },
          select: { furigana: true, responseType: true }
        })
      ]);

      const cachedResponse = communityResponse || gptResponse;
      if (cachedResponse?.furigana && cachedResponse.responseType === 'clarification') {
        const normalized = normalizeFuriganaArray(cachedResponse.furigana);
        if (normalized) {
          const furiganaArray = JSON.stringify(normalized);
          console.log(`Returning cached furigana array for clarification ${responseId}`);
          return res.status(200).json({ furiganaArray });
        }
      }
    } catch (dbError) {
      console.error('Error checking cached clarification furigana:', dbError);
    }
  }

  const furiganaPromises = blocks.map(async (block) => {
    try {
      return await generateFuriganaMarkup(block.japaneseText);
    } catch {
      throw new Error('Failed to generate furigana for block');
    }
  });

  const furiganaResults = await Promise.all(furiganaPromises);
  const furiganaArrayString = JSON.stringify(furiganaResults);

  // Cache if responseId provided and valid
  if (responseId && !responseId.includes('temp') && !responseId.includes('block')) {
    try {
      const [communityExists, gptExists] = await Promise.all([
        prisma.communityResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        }),
        prisma.gPTResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        })
      ]);

      if (communityExists) {
        await prisma.communityResponse.update({
          where: { id: responseId },
          data: { furigana: furiganaArrayString }
        });
        console.log(`Cached clarification furigana array for community response ${responseId}`);
      } else if (gptExists) {
        await prisma.gPTResponse.update({
          where: { id: responseId },
          data: { furigana: furiganaArrayString }
        });
        console.log(`Cached clarification furigana array for GPT response ${responseId}`);
      }
    } catch (dbError) {
      console.error('Error caching clarification furigana:', dbError);
    }
  }

  return res.status(200).json({ furiganaArray: furiganaArrayString });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { japaneseText, responseId, isClarification, clarificationBlocks } = req.body;
    
    // Handle clarification batch processing
    if (isClarification && clarificationBlocks && Array.isArray(clarificationBlocks)) {
      return await handleClarificationFurigana(clarificationBlocks, responseId, res);
    }
    
    if (!japaneseText) {
      return res.status(400).json({ error: 'Japanese text is required' });
    }

    // Check if responseId is provided and valid (not null, undefined, empty string, or temp)
    if (responseId && responseId !== 'null' && responseId !== 'undefined' && !responseId.includes('temp')) {
      // Determine if this is a community response or GPT response
      const [communityResponse, gptResponse] = await Promise.all([
        prisma.communityResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        }),
        prisma.gPTResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        })
      ]);

      if (communityResponse) {
        // Handle community response with caching
        const result = await getCommunityFurigana(responseId, japaneseText);
        return res.status(200).json(result);
      } else if (gptResponse) {
        // Handle regular GPT response (existing logic)
        // Check for cached furigana first
        try {
          const cachedResponse = await prisma.gPTResponse.findUnique({
            where: { id: responseId },
            select: { furigana: true }
          });

          const normalized = cachedResponse?.furigana
            ? normalizeFuriganaHtml(cachedResponse.furigana)
            : null;
          if (normalized) {
            console.log(`Returning cached furigana for response ${responseId}`);
            return res.status(200).json({ furigana: normalized });
          }
        } catch (dbError) {
          console.error('Error checking cached furigana:', dbError);
          // Continue with generation if database check fails
        }
      } else {
        // Response ID provided but not found in database - likely unsaved response
        // Continue to generation without caching
      }
    }

    // Handle case where responseId is not provided, is temp, or GPT response generation
    const furiganaResult = await generateFuriganaMarkup(japaneseText);

    // If responseId is provided and it's not a temp response, try to cache the furigana result
    if (responseId && !responseId.includes('temp')) {
      try {
        // First check if the record exists before trying to update
        const existingRecord = await prisma.gPTResponse.findUnique({
          where: { id: responseId },
          select: { id: true }
        });

        if (existingRecord) {
          await prisma.gPTResponse.update({
            where: { id: responseId },
            data: { furigana: furiganaResult }
          });
          console.log(`Cached furigana for response ${responseId}`);
        } else {
          console.log(`Response ${responseId} not found in database, skipping cache`);
        }
      } catch (dbError) {
        console.error('Error caching furigana:', dbError);
        // Don't fail the request if caching fails
      }
    }
    res.status(200).json({ furigana: furiganaResult });
  } catch (error) {
    console.error('Error generating furigana:', error);
    res.status(500).json({ error: 'Failed to generate furigana' });
  }
} 