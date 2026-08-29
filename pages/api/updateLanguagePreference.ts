import { NextApiRequest, NextApiResponse } from 'next';
import { Inngest } from 'inngest';
import { prisma, ensureDefaultDecksAndSeeds } from '@/lib';

const inngest = new Inngest({ id: 'Kondo' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, languageId } = req.body;

  if (!userId || !languageId) {
    return res.status(400).json({ message: 'User ID and Language ID are required' });
  }

  try {
    const preference = await prisma.userLanguagePreference.upsert({
      where: {
        userId: userId,
      },
      update: {
        languageId: languageId,
      },
      create: {
        userId: userId,
        languageId: languageId,
      },
    });

    // Do not block the language switch on seed copies. Return immediately so
    // the selector updates; provision in the background.
    try {
      await inngest.send({
        name: 'user.provision.seed-decks',
        data: { userId, languageId },
      });
    } catch (error) {
      console.error('Failed to enqueue seed provision; running inline', error);
      void ensureDefaultDecksAndSeeds(userId, languageId).catch((seedError) => {
        console.error('Inline seed provision failed', seedError);
      });
    }

    return res.status(200).json(preference);
  } catch (error) {
    console.error('Error updating language preference:', error);
    return res.status(500).json({ message: 'Error updating language preference' });
  }
} 