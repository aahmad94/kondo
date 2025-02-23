import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

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
    // Upsert the language preference
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

    return res.status(200).json(preference);
  } catch (error) {
    console.error('Error updating language preference:', error);
    return res.status(500).json({ message: 'Error updating language preference' });
  }
} 