import { NextApiRequest, NextApiResponse } from 'next';
import { generateUserSummary } from '../../lib/summaryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, forceRefresh } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const responses = await generateUserSummary(userId, forceRefresh === 'true');
    
    if (!responses) {
      return res.status(200).json({ success: false, responses: [] });
    }

    return res.status(200).json({ success: true, responses });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return res.status(500).json({ message: 'Error generating daily summary' });
  }
} 