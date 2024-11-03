import prisma from './prisma';

type ValidRank = 1 | 2 | 3;

export async function updateGPTResponseRank(gptResponseId: string, rank: number) {
  // Validate rank
  if (![1, 2, 3].includes(rank)) {
    throw new Error('Invalid rank value. Rank must be 1, 2, or 3.');
  }

  try {
    const updatedResponse = await prisma.gPTResponse.update({
      where: {
        id: gptResponseId,
      },
      data: {
        rank: rank as ValidRank,
      },
    });

    return updatedResponse;
  } catch (error) {
    console.error('Error updating GPT response rank:', error);
    throw error;
  }
} 