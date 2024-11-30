import { NextApiRequest, NextApiResponse } from 'next';
import { generateUserSummary, saveDailySummary } from '../../lib/summaryService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  try {
    const summary = await generateUserSummary(userId);
    
    if (!summary) {
      return res.status(404).json({ 
        success: false, 
        message: 'No responses found to generate summary' 
      });
    }

    const savedSummary = await saveDailySummary(userId, summary);
    
    return res.status(200).json({ 
      success: true, 
      summary: savedSummary 
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating summary' 
    });
  }
} 