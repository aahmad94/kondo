'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { updateLandingPage, type LandingPage } from '@/lib/user';

export async function updateUserLandingPageAction(landingPage: LandingPage) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error('Unauthorized: No user session found');
    }

    const updated = await updateLandingPage(session.user.email, landingPage);

    return {
      success: true,
      landingPage: updated,
      message: 'Landing page updated successfully',
    };
  } catch (error) {
    console.error('Error updating landing page:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update landing page',
    };
  }
}
