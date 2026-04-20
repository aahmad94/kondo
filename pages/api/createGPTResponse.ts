import { NextApiRequest, NextApiResponse } from 'next';
import { createGPTResponse } from '@/lib';
import {
  checkResponseQuota,
  incrementResponseUsage,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, userId, bookmarkId, responseType } = req.body as {
      content: string;
      userId: string;
      bookmarkId?: string;
      responseType?: string;
    };

    try {
      // Enforce weekly response quota before saving to library
      if (userId) {
        const quota = await checkResponseQuota(userId);
        if (!quota.allowed) {
          return res.status(429).json(quotaExceededResponse('responses', quota));
        }
      }

      const result = await createGPTResponse(content, userId, bookmarkId, responseType);

      // Increment after successful creation
      if (userId) {
        await incrementResponseUsage(userId);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create GPT response' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
