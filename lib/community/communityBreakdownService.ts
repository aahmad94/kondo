import prisma from '../database/prisma';
import fs from 'fs';
import path from 'path';

const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

/**
 * Gets or generates breakdown for a community response with caching
 */
export async function getCommunityBreakdown(
  communityResponseId: string, 
  isMobile?: boolean
) {
  if (!communityResponseId) {
    throw new Error('Community response ID is required');
  }

  try {
    // First, check if we already have the breakdown cached
    const existingCommunityResponse = await prisma.communityResponse.findUnique({
      where: { id: communityResponseId },
      select: { 
        breakdown: true, 
        mobileBreakdown: true,
        content: true,
        language: { select: { code: true } }
      }
    });

    if (!existingCommunityResponse) {
      throw new Error('Community response not found');
    }

    // If we already have both breakdowns, return them along with the requested one
    if (existingCommunityResponse.breakdown && existingCommunityResponse.mobileBreakdown) {
      const requestedBreakdown = isMobile ? existingCommunityResponse.mobileBreakdown : existingCommunityResponse.breakdown;
      return {
        breakdown: requestedBreakdown,
        desktopBreakdown: existingCommunityResponse.breakdown,
        mobileBreakdown: existingCommunityResponse.mobileBreakdown
      };
    }

    // Return existing breakdown based on device type if available
    if (isMobile && existingCommunityResponse.mobileBreakdown) {
      return {
        breakdown: existingCommunityResponse.mobileBreakdown,
        desktopBreakdown: existingCommunityResponse.breakdown || '',
        mobileBreakdown: existingCommunityResponse.mobileBreakdown
      };
    } else if (!isMobile && existingCommunityResponse.breakdown) {
      return {
        breakdown: existingCommunityResponse.breakdown,
        desktopBreakdown: existingCommunityResponse.breakdown,
        mobileBreakdown: existingCommunityResponse.mobileBreakdown || ''
      };
    }

    // Generate new breakdown since we don't have it cached
    const breakdown = await generateCommunityBreakdown(
      existingCommunityResponse.content,
      existingCommunityResponse.language.code,
      isMobile
    );

    // Update the community response with the new breakdown
    const updateData = isMobile 
      ? { mobileBreakdown: breakdown }
      : { breakdown };
      
    await prisma.communityResponse.update({
      where: { id: communityResponseId },
      data: updateData
    });

    // Return the new breakdown along with any existing ones
    return {
      breakdown,
      desktopBreakdown: isMobile ? (existingCommunityResponse.breakdown || '') : breakdown,
      mobileBreakdown: isMobile ? breakdown : (existingCommunityResponse.mobileBreakdown || '')
    };
  } catch (error) {
    console.error('Error getting community breakdown:', error);
    throw error;
  }
}

/**
 * Generates a breakdown for community response content using OpenAI
 */
async function generateCommunityBreakdown(
  content: string,
  languageCode: string,
  isMobile?: boolean
): Promise<string> {
  try {
    // Extract content between 1/ and 2/ using regex
    const match = content.match(/1\/\s*([\s\S]*?)\s*2\//);
    if (!match || !match[1]) {
      throw new Error('Could not extract content for breakdown');
    }

    const extractedContent = match[1].trim();

    // Find the last numbered line by finding all numbers and getting the max
    const numbers = [...content.matchAll(/(\d+)\//g)].map(match => parseInt(match[1]));
    const lastNumber = Math.max(...numbers);

    // Extract content from the last numbered line (original user input)
    const lastLineRegex = new RegExp(`${lastNumber}/\\s*([^\\r\\n]*)`);
    const lastLineMatch = content.match(lastLineRegex);
    const originalUserInput = lastLineMatch ? lastLineMatch[1].trim() : '';

    // Combine content with original user input
    const combinedContent = extractedContent + '\n' + originalUserInput;

    // Choose the appropriate prompt based on device type
    const promptSuffix = isMobile ? 'mobile_breakdown' : 'breakdown';
    const breakdownPromptPath = path.join(process.cwd(), 'prompts', `${languageCode}_gpt_${promptSuffix}_prompt.txt`);
    const breakdownSystemPrompt = fs.readFileSync(breakdownPromptPath, 'utf8');

    // Generate new breakdown using dedicated breakdown prompt
    const response = await fetch(`${appUrl}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: combinedContent,
        systemPrompt: breakdownSystemPrompt,
        model: 'gpt-4o'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate breakdown');
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error generating community breakdown:', error);
    throw error;
  }
}
