import { NextApiRequest, NextApiResponse } from 'next';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import prisma from '../../lib/prisma';

let kuroshiro: Kuroshiro | null = null;
let initializationPromise: Promise<Kuroshiro> | null = null;

async function initKuroshiro(): Promise<Kuroshiro> {
  // If already initialized, return immediately
  if (kuroshiro) {
    return kuroshiro;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    console.log('Waiting for existing initialization...');
    return initializationPromise;
  }

  // Start initialization
  console.log('Starting Kuroshiro initialization...');
  initializationPromise = (async () => {
    try {
      const newKuroshiro = new Kuroshiro();
      // On server-side, we can access node_modules directly
      await newKuroshiro.init(new KuromojiAnalyzer());
      console.log('Kuroshiro initialized successfully');
      kuroshiro = newKuroshiro; // Only set after successful initialization
      return kuroshiro;
    } catch (error) {
      console.error('Failed to initialize Kuroshiro:', error);
      // Reset the promise so subsequent requests can retry
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

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

    // Always wait for initialization to complete
    const kuroshiroInstance = await initKuroshiro();
    
    // Double-check that kuroshiro is properly initialized
    if (!kuroshiroInstance) {
      throw new Error('Kuroshiro instance is null after initialization');
    }

    const furiganaResult = await kuroshiroInstance.convert(japaneseText, {
      mode: 'furigana',
      to: 'hiragana'
    });

    // If responseId is provided, cache the furigana result
    if (responseId) {
      try {
        await prisma.gPTResponse.update({
          where: { id: responseId },
          data: { furigana: furiganaResult }
        });
        console.log(`Cached furigana for response ${responseId}`);
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