import { NextApiRequest, NextApiResponse } from 'next';
import { checkBookmarkExists, createBookmark } from '../../lib/bookmarkService';
import { getUserLanguageId } from '../../lib/languageService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, userId } = req.body as {
      title: string;
      userId: string;
    };

    try {
      // Get user's language ID (with fallback to Japanese)
      const languageId = await getUserLanguageId(userId);

      // Check if bookmark already exists for this language
      const exists = await checkBookmarkExists(userId, title, languageId);
      
      if (exists) {
        return res.status(400).json({ error: 'A bookmark with this title already exists' });
      }

      const newBookmark = await createBookmark(userId, title, languageId);
      res.status(200).json(newBookmark);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create bookmark' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
