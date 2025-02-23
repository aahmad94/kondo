import { NextApiRequest, NextApiResponse } from 'next';
import { checkBookmarkExists, createBookmark } from '../../lib/bookmarkService';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, userId } = req.body as {
      title: string;
      userId: string;
    };

    try {
      // Get user's language preference
      let userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });

      // If no preference is set, get the Japanese language ID
      if (!userLanguagePreference) {
        const japanese = await prisma.language.findUnique({
          where: { code: 'ja' },
          select: { id: true }
        });
        if (!japanese) {
          return res.status(500).json({ error: 'Default language not found' });
        }
        userLanguagePreference = { languageId: japanese.id };
      }

      // Check if bookmark already exists for this language
      const exists = await checkBookmarkExists(userId, title, userLanguagePreference.languageId);
      
      if (exists) {
        return res.status(400).json({ error: 'A bookmark with this title already exists' });
      }

      const newBookmark = await createBookmark(userId, title, userLanguagePreference.languageId);
      res.status(200).json(newBookmark);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
