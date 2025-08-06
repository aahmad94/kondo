import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email } = req.body as {
      email: string;
    };

    try {
      const newUser = await prisma.user.create({
        data: {
          email,
        },
      });

      res.status(200).json(newUser);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes('Unique constraint failed on the fields: (`email`)')) {
        res.status(400).json({ error: 'User with this email already exists' });
      } else {
        res.status(500).json({ error: 'Failed to create user' });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
