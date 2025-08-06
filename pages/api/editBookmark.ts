import { NextApiRequest, NextApiResponse } from 'next';
import { checkBookmarkExists, prisma } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    const { id, title, userId } = req.body as {
      id: string;
      title: string;
      userId: string;
    };

    try {
      // First verify that the bookmark exists and belongs to the user
      const existingBookmark = await prisma.bookmark.findUnique({
        where: { id },
        select: { userId: true, languageId: true }
      });

      if (!existingBookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      if (existingBookmark.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Check if a bookmark with the new title already exists for this user and language
      const titleExists = await checkBookmarkExists(userId, title, existingBookmark.languageId);
      
      if (titleExists) {
        return res.status(400).json({ error: 'A bookmark with this title already exists' });
      }

      // Update the bookmark
      const updatedBookmark = await prisma.bookmark.update({
        where: { id },
        data: {
          title,
          updatedAt: new Date()
        }
      });

      res.status(200).json(updatedBookmark);
    } catch (error) {
      console.error('Error updating bookmark:', error);
      res.status(500).json({ error: 'Failed to update bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 