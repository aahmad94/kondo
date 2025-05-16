import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { bookmarkId, userId } = req.query;

  if (!bookmarkId || !userId || typeof userId !== 'string' || typeof bookmarkId !== 'string') {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // First get the bookmark to get its languageId
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        id: bookmarkId
      },
      select: {
        languageId: true
      }
    });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    const responses = await prisma.gPTResponse.findMany({
      where: {
        bookmarks: {
          some: {
            id: bookmarkId
          }
        },
        languageId: bookmark.languageId // Use the bookmark's languageId
      },
      select: {
        id: true,
        content: true,
        rank: true,
        isPaused: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        rank: 'asc'
      }
    });

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        id: bookmarkId,
        responses: {
          some: {
            id: {
              in: responses.map(response => response.id)
            }
          }
        }
      }
    });

    const bookmarkDict: Record<string, string> = {};
    responses.forEach(response => {
      bookmarkDict[response.id] = bookmarkId;
    });

    const formattedResponses = responses.map(response => ({
      ...response,
      bookmarks: bookmarkDict
    }));

    return res.status(200).json(formattedResponses);
  } catch (error) {
    console.error('Error fetching bookmark responses:', error);
    return res.status(500).json({ message: 'Error fetching bookmark responses' });
  }
}
