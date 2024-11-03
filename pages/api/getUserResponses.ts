import { NextApiRequest, NextApiResponse } from 'next';
import { getUserResponses } from '../../lib/GPTResponseService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const responses = await getUserResponses(userId);
    return res.status(200).json(responses);
  } catch (error) {
    console.error('Error in getUserResponses endpoint:', error);
    return res.status(500).json({ message: 'Error fetching user responses' });
  }
} 