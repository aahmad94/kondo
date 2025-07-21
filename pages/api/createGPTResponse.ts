import { NextApiRequest, NextApiResponse } from 'next';
import { createGPTResponse } from '../../lib/GPTResponseService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, userId, bookmarkId } = req.body as {
      content: string;
      userId: string;
      bookmarkId?: string;
    };

    try {
      const newResponse = await createGPTResponse(content, userId, bookmarkId);
      res.status(200).json(newResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create GPT response' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
