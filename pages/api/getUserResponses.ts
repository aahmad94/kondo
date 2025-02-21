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
    const responses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        rank: true,
        bookmarks: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform bookmarks into a dictionary format
    const transformedResponses = responses.map(response => ({
      ...response,
      bookmarks: response.bookmarks.reduce((acc, bookmark) => {
        acc[bookmark.id] = bookmark.title;
        return acc;
      }, {} as Record<string, string>)
    }));

    return res.status(200).json(transformedResponses);
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return res.status(500).json({ message: 'Error fetching user responses' });
  }
} 