'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import prisma from "@/lib/database/prisma";

/**
 * Server action to save a note to a GPTResponse
 */
export async function saveNoteAction(responseId: string, note: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to save notes' 
      };
    }

    // Get userId from session
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    // Verify the response exists and belongs to the user
    const gptResponse = await prisma.gPTResponse.findUnique({
      where: { id: responseId },
      select: { userId: true }
    });

    if (!gptResponse) {
      return {
        success: false,
        error: 'Response not found'
      };
    }

    if (gptResponse.userId !== userId) {
      return {
        success: false,
        error: 'You can only add notes to your own responses'
      };
    }

    // Update the note
    await prisma.gPTResponse.update({
      where: { id: responseId },
      data: { note: note || null } // Set to null if empty string
    });

    return {
      success: true,
      message: 'Note saved successfully'
    };
  } catch (error) {
    console.error('Error in saveNoteAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save note'
    };
  }
}

