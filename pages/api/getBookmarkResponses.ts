import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, bookmarkId } = req.query;

  if (!userId || typeof userId !== 'string' || !bookmarkId || typeof bookmarkId !== 'string') {
    return res.status(400).json({ message: 'User ID and Bookmark ID are required' });
  }

  try {
    const responses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId,
        bookmarks: {
          some: {
            id: bookmarkId
          }
        }
      },
      orderBy: [
        { rank: 'asc' },      // Lower ranks first
        { createdAt: 'desc' } // older items last within same rank
      ],
      select: {
        id: true,
        content: true,
        rank: true,
        createdAt: true
      }
    });

    return res.status(200).json(responses);
  } catch (error) {
    console.error('Error fetching bookmark responses:', error);
    return res.status(500).json({ message: 'Error fetching bookmark responses' });
  }
}
