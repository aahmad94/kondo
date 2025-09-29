import prisma from '../database/prisma';
import fs from 'fs';
import path from 'path';

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

    // If we already have cached furigana, return it
    if (existingCommunityResponse.furigana) {
      console.log(`Returning cached furigana for community response ${communityResponseId}`);
      return {
        furigana: existingCommunityResponse.furigana
      };
    }

    // Generate new furigana since we don't have it cached
    const furiganaResult = await generateCommunityFurigana(japaneseText);

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

/**
 * Generates furigana for community response content using OpenAI
 */
async function generateCommunityFurigana(
  japaneseText: string
): Promise<string> {
  try {
    // Load furigana prompt from file (same as GPT response)
    const promptPath = path.join(process.cwd(), 'prompts', 'furigana_prompt.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    const prompt = promptTemplate.replace('{japaneseText}', japaneseText);

    // Generate furigana using server-side API approach (same as GPT response)
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
    return data.result;
  } catch (error) {
    console.error('Error generating community furigana:', error);
    throw error;
  }
}
