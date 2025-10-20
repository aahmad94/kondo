import { NextApiRequest, NextApiResponse } from 'next';
import { createGPTResponse } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, userId, bookmarkId, responseType } = req.body as {
      content: string;
      userId: string;
      bookmarkId?: string;
      responseType?: string;
    };

    try {
      const result = await createGPTResponse(content, userId, bookmarkId, responseType);
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create GPT response' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
