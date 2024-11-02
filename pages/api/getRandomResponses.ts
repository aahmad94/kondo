import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const randomResponses = await prisma.gPTResponse.findMany({
      where: {
        userId: userId,
      },
      take: 7,
      orderBy: {
        // This creates random ordering in Postgres
        createdAt: 'desc',
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    return res.status(200).json(randomResponses);
  } catch (error) {
    console.error('Error fetching random responses:', error);
    return res.status(500).json({ message: 'Error fetching random responses' });
  }
} 