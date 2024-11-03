import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, userId } = req.body as {
      title: string;
      userId: number;
    };

    try {
      const newBookmark = await prisma.bookmark.create({
        data: {
          title,
          user: {
            connect: { id: userId.toString() },
          },
        },
      });

      res.status(200).json(newBookmark);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
