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
      // Create a new GPT response and link it to a bookmark
      const newResponse = await prisma.gPTResponse.create({
        data: {
          content: gptResponseContent,
          user: {
            connect: { id: userId },
          },
          bookmarks: {
            connect: { id: bookmarkId },
          },
        },
      });

      res.status(200).json(newResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add response to bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
