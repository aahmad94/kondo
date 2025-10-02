import { NextApiRequest, NextApiResponse } from 'next';
import { getUserStreak } from '@/lib/user/streakService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const streakData = await getUserStreak(userId);
      res.status(200).json(streakData);
    } catch (error) {
      console.error('Error fetching user streak:', error);
      res.status(500).json({ error: 'Failed to fetch user streak' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

