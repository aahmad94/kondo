import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
      // Get user's language preference
      const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });

      // If no preference is set, get the Japanese language ID
      let languageId;
      if (!userLanguagePreference) {
        const japanese = await prisma.language.findUnique({
          where: { code: 'ja' },
          select: { id: true }
        });
        if (!japanese) {
          return res.status(500).json({ error: 'Default language not found' });
        }
        languageId = japanese.id;
      } else {
        languageId = userLanguagePreference.languageId;
      }

      const bookmarks = await prisma.bookmark.findMany({
        where: {
          userId: userId,
          languageId: languageId
        },
        include: {
          responses: true,
        },
      });
      res.status(200).json(bookmarks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
