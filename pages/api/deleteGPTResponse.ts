import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ message: 'Request body is required' });
  }

  const { gptResponseId, bookmarks } = req.body;

  if (!gptResponseId) {
    return res.status(400).json({ message: 'GPT Response ID is required' });
  }

  try {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Check if this is an imported response and get community import info
      const communityImport = await tx.communityImport.findUnique({
        where: { importedResponseId: gptResponseId },
        include: { communityResponse: true }
      });

      // Disconnect all bookmarks first
      if (bookmarks && Object.keys(bookmarks).length > 0) {
        await tx.gPTResponse.update({
          where: { id: gptResponseId },
          data: {
            bookmarks: {
              disconnect: Object.keys(bookmarks).map(id => ({ id }))
            }
          }
        });

        // Update all affected bookmarks' updatedAt field to reflect the interaction
        await tx.bookmark.updateMany({
          where: {
            id: {
              in: Object.keys(bookmarks)
            }
          },
          data: { updatedAt: new Date() }
        });
      }

      // If this was an imported response, decrement the import count on the community response
      if (communityImport) {
        await tx.communityResponse.update({
          where: { id: communityImport.communityResponseId },
          data: {
            importCount: {
              decrement: 1
            }
          }
        });
      }

      // Delete the response itself (this will cascade delete the CommunityImport due to the schema)
      await tx.gPTResponse.delete({
        where: { id: gptResponseId }
      });
    });

    return res.status(200).json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Error deleting response:', error);
    return res.status(500).json({ message: 'Error deleting response' });
  }
}
