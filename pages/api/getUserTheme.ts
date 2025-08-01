import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getUserTheme } from '../../lib/userService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const theme = await getUserTheme(session.user.email);

    return res.status(200).json({ theme });

  } catch (error) {
    console.error('Error getting user theme:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 