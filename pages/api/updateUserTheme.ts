import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { updateUserTheme, Theme } from '../../lib/userService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { theme } = req.body;

    if (!theme || !['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be "light" or "dark"' });
    }

    const updatedTheme = await updateUserTheme(session.user.email, theme as Theme);

    return res.status(200).json({ 
      success: true, 
      theme: updatedTheme 
    });

  } catch (error) {
    console.error('Error updating user theme:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 