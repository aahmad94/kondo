import { NextApiRequest, NextApiResponse } from 'next';
import { toggleResponsePause } from '../../lib/GPTResponseService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { responseId, isPaused } = req.body;

  if (!responseId) {
    return res.status(400).json({ message: 'Response ID is required' });
  }

  if (typeof isPaused !== 'boolean') {
    return res.status(400).json({ message: 'isPaused must be a boolean value' });
  }

  try {
    const updatedResponse = await toggleResponsePause(responseId, isPaused);
    return res.status(200).json({ 
      success: true, 
      isPaused: updatedResponse.isPaused
    });
  } catch (error: any) {
    if (error.message === 'Response not found') {
      return res.status(404).json({ 
        success: false, 
        message: error.message 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Error toggling response pause state' 
    });
  }
} 