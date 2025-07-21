import { NextApiRequest, NextApiResponse } from 'next';
import { getBookmarks } from '../../lib/bookmarkService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    try {
      const bookmarks = await getBookmarks(userId);
      res.status(200).json(bookmarks);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
