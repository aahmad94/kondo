import { NextApiRequest, NextApiResponse } from 'next';
import { updateGPTResponseRank } from '../../lib/GPTResponseService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { gptResponseId, rank } = req.body;

  if (!gptResponseId || typeof gptResponseId !== 'string') {
    return res.status(400).json({ message: 'GPT Response ID is required' });
  }

  if (!rank || typeof rank !== 'number') {
    return res.status(400).json({ message: 'Rank is required and must be a number' });
  }

  try {
    const updatedResponse = await updateGPTResponseRank(gptResponseId, rank);
    return res.status(200).json(updatedResponse);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid rank value')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error in updateGPTResponseRank endpoint:', error);
    return res.status(500).json({ message: 'Error updating GPT response rank' });
  }
} 