import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { bookmarkId, gptResponseContent, userId } = req.body as {
      bookmarkId: string;
      gptResponseContent: string;
      userId: string;
    };

    try {
      // First, get the bookmark to get its languageId
      const bookmark = await prisma.bookmark.findUnique({
        where: { id: bookmarkId },
        select: { languageId: true }
      });

      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      // Create a new GPT response and link it to the bookmark using unchecked create
      const newResponse = await prisma.gPTResponse.create({
        data: {
          content: gptResponseContent,
          userId: userId,
          languageId: bookmark.languageId,
          bookmarks: {
            connect: { id: bookmarkId },
          },
        },
      });

      res.status(200).json(newResponse);
    } catch (error) {
      console.error('Error adding response to bookmark:', error);
      res.status(500).json({ error: 'Failed to add response to bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
