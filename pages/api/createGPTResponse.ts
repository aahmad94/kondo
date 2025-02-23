import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, userId, bookmarkId } = req.body as {
      content: string;
      userId: string;
      bookmarkId?: string;
    };

    try {
      // Get user's language preference
      const userLanguagePreference = await prisma.userLanguagePreference.findUnique({
        where: { userId },
        select: { languageId: true }
      });

      // If no preference is set, get the Japanese language ID
      const languageId = userLanguagePreference?.languageId || (
        await prisma.language.findUnique({
          where: { code: 'ja' },
          select: { id: true }
        })
      )?.id;

      if (!languageId) {
        throw new Error('Language not found');
      }

      const newResponse = await prisma.gPTResponse.create({
        data: {
          content,
          user: {
            connect: { id: userId },
          },
          language: {
            connect: { id: languageId },
          },
          ...(bookmarkId && {
            bookmarks: {
              connect: { id: bookmarkId },
            },
          }),
        },
      });

      res.status(200).json(newResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create GPT response' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
