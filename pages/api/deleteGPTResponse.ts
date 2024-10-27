import { NextApiRequest, NextApiResponse } from 'next';
import { deleteGptResponse } from '../../lib/bookmarkService';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { gptResponseId, bookmarkId } = req.query;

    if (!gptResponseId || !bookmarkId || typeof gptResponseId !== 'string' || typeof bookmarkId !== 'string') {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    await deleteGptResponse(session.userId, gptResponseId, bookmarkId);
    res.status(200).json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Error in deleteGPTResponse API:', error);
    res.status(500).json({ message: 'Error deleting response' });
  }
}
