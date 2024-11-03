import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, userId, bookmarkId } = req.body as {
      content: string;
      userId: number;
      bookmarkId?: number;
    };

    try {
      const newResponse = await prisma.gPTResponse.create({
        data: {
          content,
          user: {
            connect: { id: userId.toString() },
          },
          ...(bookmarkId && {
            bookmarks: {
              connect: { id: bookmarkId.toString() },
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
