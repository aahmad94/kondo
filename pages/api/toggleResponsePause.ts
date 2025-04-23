import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { responseId, isPaused } = req.body;

  if (!responseId) {
    return res.status(400).json({ message: 'Response ID is required' });
  }

  if (typeof isPaused !== 'boolean') {
    return res.status(400).json({ message: 'isPaused must be a boolean value' });
  }

  try {
    // Check if the response exists
    const response = await prisma.gPTResponse.findUnique({
      where: { id: responseId }
    });

    if (!response) {
      return res.status(404).json({ 
        success: false, 
        message: 'Response not found' 
      });
    }

    // Update the response's isPaused status using Prisma's update API
    const updatedResponse = await prisma.gPTResponse.update({
      where: { id: responseId },
      data: { isPaused },
      select: { id: true, isPaused: true }
    });

    return res.status(200).json({ 
      success: true, 
      isPaused: updatedResponse.isPaused
    });
  } catch (error) {
    console.error('Error toggling response pause state:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error toggling response pause state' 
    });
  }
} 