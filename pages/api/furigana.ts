import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { japaneseText, responseId } = req.body;
    
    if (!japaneseText) {
      return res.status(400).json({ error: 'Japanese text is required' });
    }

    // If responseId is provided, check for cached furigana first
    if (responseId) {
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
    }

    // Generate furigana using server-side API approach
    const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${appUrl}/api/openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: `Convert the following Japanese text to furigana format using HTML ruby tags. Only add furigana for kanji characters, leave hiragana and katakana as-is. Use this exact format: <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>

Text: ${japaneseText}`,
        languageCode: 'ja',
        model: 'gpt-4o-mini'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate furigana');
    }

    const data = await response.json();
    const furiganaResult = data.result;

    // If responseId is provided, try to cache the furigana result
    if (responseId) {
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