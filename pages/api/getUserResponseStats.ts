import { NextApiRequest, NextApiResponse } from 'next';
import { getUserResponseStats } from '../../lib/GPTResponseService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, language } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ message: 'Language is required' });
  }

  try {
    const stats = await getUserResponseStats(userId, language);
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user response stats:', error);
    return res.status(500).json({ message: 'Error fetching user response stats' });
  }
} 