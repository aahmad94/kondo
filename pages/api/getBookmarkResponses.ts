import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { bookmarkId } = req.query;

    if (!bookmarkId || typeof bookmarkId !== 'string') {
      return res.status(400).json({ error: 'Invalid bookmarkId' });
    }

    try {
      const responses = await prisma.gPTResponse.findMany({
        where: {
          bookmarks: {
            some: {
              id: bookmarkId,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      res.status(200).json(responses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bookmark responses' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
