import { NextApiRequest, NextApiResponse } from 'next';
import { updateKanaEnabled } from '../../lib/GPTResponseService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { responseId, isKanaEnabled } = req.body;

    if (!responseId) {
      return res.status(400).json({ error: 'Response ID is required' });
    }

    if (typeof isKanaEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isKanaEnabled must be a boolean' });
    }

    const updatedResponse = await updateKanaEnabled(responseId, isKanaEnabled);
    res.status(200).json(updatedResponse);
  } catch (error: any) {
    console.error('Error updating kana enabled state:', error);
    res.status(500).json({ error: error.message || 'Failed to update kana enabled state' });
  }
} 