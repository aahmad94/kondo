import { NextApiRequest, NextApiResponse } from 'next';
import { getAllUserResponsesByLanguage } from '@/lib';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, page, limit } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Parse pagination parameters with defaults
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const limitNum = limit ? parseInt(limit as string, 10) : 20;

  try {
    const result = await getAllUserResponsesByLanguage(userId as string, pageNum, limitNum);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return res.status(500).json({ message: 'Error fetching user responses' });
  }
} 