import { NextApiRequest, NextApiResponse } from 'next';
import { getAllUserResponsesByLanguage } from '../../lib/GPTResponseService';

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
    const transformedResponses = await getAllUserResponsesByLanguage(userId);
    return res.status(200).json(transformedResponses);
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return res.status(500).json({ message: 'Error fetching user responses' });
  }
} 