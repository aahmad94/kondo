import { NextApiRequest, NextApiResponse } from 'next';
import { updateFuriganaEnabled } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { responseId, isFuriganaEnabled } = req.body;
    
    // Check if responseId includes 'temp' - if so, return early without making API call
    if (responseId && responseId.includes('temp')) {
      return res.status(200).json({ id: responseId, isFuriganaEnabled });
    }

    const updatedResponse = await updateFuriganaEnabled(responseId, isFuriganaEnabled);
    res.status(200).json(updatedResponse);
  } catch (error: any) {
    console.error('Error updating furigana enabled state:', error);
    res.status(500).json({ error: error.message || 'Failed to update furigana enabled state' });
  }
} 