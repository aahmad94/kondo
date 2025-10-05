import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';
import { updateStreakOnActivity } from '@/lib/user/streakService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { bookmarkId, gptResponseContent, userId, cachedAudio, desktopBreakdownContent, mobileBreakdownContent, furigana, isFuriganaEnabled, isPhoneticEnabled, isKanaEnabled, timezone } = req.body as {
      bookmarkId: string;
      gptResponseContent: string;
      userId: string;
      cachedAudio?: { audio: string; mimeType: string } | null;
      desktopBreakdownContent?: string | null;
      mobileBreakdownContent?: string | null;
      furigana?: string | null;
      isFuriganaEnabled?: boolean | null;
      isPhoneticEnabled?: boolean | null;
      isKanaEnabled?: boolean | null;
      timezone?: string;
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
          // Add cached data if available
          ...(cachedAudio && {
            audio: cachedAudio.audio,
            audioMimeType: cachedAudio.mimeType
          }),
          ...(desktopBreakdownContent && {
            breakdown: desktopBreakdownContent
          }),
          ...(mobileBreakdownContent && {
            mobileBreakdown: mobileBreakdownContent
          }),
          ...(furigana && {
            furigana: furigana
          }),
          ...(typeof isFuriganaEnabled === 'boolean' && {
            isFuriganaEnabled: isFuriganaEnabled
          }),
          ...(typeof isPhoneticEnabled === 'boolean' && {
            isPhoneticEnabled: isPhoneticEnabled
          }),
          ...(typeof isKanaEnabled === 'boolean' && {
            isKanaEnabled: isKanaEnabled
          })
        },
      });

      // Update the bookmark's updatedAt field to reflect the interaction
      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: { updatedAt: new Date() }
      });

      // Update user's streak since they added a response to a deck
      const streakData = await updateStreakOnActivity(userId, timezone || 'UTC');

      res.status(200).json({ response: newResponse, streakData });
    } catch (error) {
      console.error('Error adding response to bookmark:', error);
      res.status(500).json({ error: 'Failed to add response to bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
