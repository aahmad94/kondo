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
    // Get user's language preference
    const languagePreference = await prisma.userLanguagePreference.findUnique({
      where: { userId },
      select: { languageId: true }
    });

    // If no preference is set, get the Japanese language ID
    const languageId = languagePreference?.languageId || (
      await prisma.language.findUnique({
        where: { code: 'ja' },
        select: { id: true }
      })
    )?.id;

    if (!languageId) {
      return res.status(404).json({ message: 'Language not found' });
    }

    const responses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId,
        languageId: languageId
      },
      select: {
        id: true,
        content: true,
        rank: true,
        isPaused: true,
        bookmarks: {
          select: {
            id: true,
            title: true
          }
        },
        createdAt: true,
        updatedAt: true,
        furigana: true,
        isFuriganaEnabled: true,
        isPhoneticEnabled: true,
        isKanaEnabled: true
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