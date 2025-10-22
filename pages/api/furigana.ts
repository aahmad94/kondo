import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';
import { getCommunityFurigana } from '@/lib/community';
import fs from 'fs';
import path from 'path';

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
        // Try to parse as JSON array
        try {
          const parsed = JSON.parse(cachedResponse.furigana);
          if (Array.isArray(parsed)) {
            console.log(`Returning cached furigana array for clarification ${responseId}`);
            return res.status(200).json({ furiganaArray: cachedResponse.furigana });
          }
        } catch (e) {
          // Not a JSON array, continue to generation
        }
      }
    } catch (dbError) {
      console.error('Error checking cached clarification furigana:', dbError);
    }
  }

  // Generate furigana for each block
  const promptPath = path.join(process.cwd(), 'prompts', 'furigana_prompt.txt');
  const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
  const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  const furiganaPromises = blocks.map(async (block) => {
    const prompt = promptTemplate.replace('{japaneseText}', block.japaneseText);
    
    const response = await fetch(`${appUrl}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: prompt,
        languageCode: 'ja',
        model: 'gpt-4o'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate furigana for block');
    }

    const data = await response.json();
    return data.result;
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

          if (cachedResponse?.furigana) {
            console.log(`Returning cached furigana for response ${responseId}`);
            return res.status(200).json({ furigana: cachedResponse.furigana });
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

    // Generate furigana for GPT response (existing logic)
    // Load furigana prompt from file
    const promptPath = path.join(process.cwd(), 'prompts', 'furigana_prompt.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    const prompt = promptTemplate.replace('{japaneseText}', japaneseText);

    // Generate furigana using server-side API approach
    const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${appUrl}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: prompt,
        languageCode: 'ja',
        model: 'gpt-4o'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate furigana');
    }

    const data = await response.json();
    const furiganaResult = data.result;

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