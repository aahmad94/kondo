import { NextApiRequest, NextApiResponse } from 'next';
import { deleteBookmark } from '../lib/bookmarkService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, bookmarkId } = req.body;

  if (!userId || !bookmarkId) {
    return res.status(400).json({ message: 'Missing userId or bookmarkId' });
  }

  try {
    await deleteBookmark(userId, bookmarkId);
    res.status(200).json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error in deleteBookmark API:', error);
    res.status(500).json({ message: 'Error deleting bookmark' });
  }
}
