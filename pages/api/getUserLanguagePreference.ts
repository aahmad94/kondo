import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Get user's language preference
    const preference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      select: { languageId: true }
    });

    // If no preference is set, get the Japanese language ID
    if (!preference) {
      const japanese = await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      });

      return res.status(200).json({ languageId: japanese?.id });
    }

    return res.status(200).json(preference);
  } catch (error) {
    console.error('Error fetching user language preference:', error);
    return res.status(500).json({ message: 'Error fetching user language preference' });
  }
} 