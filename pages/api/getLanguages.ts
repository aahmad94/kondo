import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const languages = await prisma.language.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return res.status(200).json(languages);
  } catch (error) {
    console.error('Error fetching languages:', error);
    return res.status(500).json({ message: 'Error fetching languages' });
  }
} 