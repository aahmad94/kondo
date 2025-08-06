import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { updatePhoneticEnabled } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { responseId, isPhoneticEnabled } = req.body;

    if (!responseId) {
      return res.status(400).json({ error: 'Response ID is required' });
    }

    if (typeof isPhoneticEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isPhoneticEnabled must be a boolean' });
    }

    const updatedResponse = await updatePhoneticEnabled(responseId, isPhoneticEnabled);
    
    res.status(200).json(updatedResponse);
  } catch (error) {
    console.error('Error updating phonetic enabled state:', error);
    res.status(500).json({ error: 'Failed to update phonetic enabled state' });
  }
} 