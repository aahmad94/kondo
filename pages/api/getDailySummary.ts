import { NextApiRequest, NextApiResponse } from 'next';
import { generateUserSummary } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, forceRefresh, allLanguages } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const data = await generateUserSummary(
      userId, 
      forceRefresh === 'true',
      allLanguages === 'true'
    );

    const { allResponses: responses, createdAt } = data;
    
    if (!responses || responses.length === 0) {
      return res.status(200).json({ success: false, responses: [] });
    }

    return res.status(200).json({ success: true, responses, createdAt });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return res.status(500).json({ message: 'Error generating daily summary' });
  }
} 