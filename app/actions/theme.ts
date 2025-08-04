'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "../../pages/api/auth/[...nextauth]";
import { updateUserTheme } from "../../lib/userService";

export async function updateUserThemeAction(theme: 'light' | 'dark') {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Unauthorized: No user session found');
    }

    const updatedTheme = await updateUserTheme(session.user.email, theme);
    
    return { 
      success: true, 
      theme: updatedTheme,
      message: 'Theme updated successfully' 
    };
  } catch (error) {
    console.error('Error updating user theme:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update theme' 
    };
  }
}