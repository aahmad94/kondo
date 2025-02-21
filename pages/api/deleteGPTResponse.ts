import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ message: 'Request body is required' });
  }

  const { gptResponseId, bookmarks } = req.body;

  if (!gptResponseId) {
    return res.status(400).json({ message: 'GPT Response ID is required' });
  }

  try {
    // Disconnect all bookmarks first
    if (bookmarks && Object.keys(bookmarks).length > 0) {
      await prisma.gPTResponse.update({
        where: { id: gptResponseId },
        data: {
          bookmarks: {
            disconnect: Object.keys(bookmarks).map(id => ({ id }))
          }
        }
      });
    }

    // Then delete the response itself
    await prisma.gPTResponse.delete({
      where: { id: gptResponseId }
    });

    return res.status(200).json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Error deleting response:', error);
    return res.status(500).json({ message: 'Error deleting response' });
  }
}
