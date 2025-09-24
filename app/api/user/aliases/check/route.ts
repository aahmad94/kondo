import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  checkAliasAvailability,
  validateAliasFormat
} from '@/lib/user/aliasService';

// GET /api/user/aliases/check?alias=<alias> - Check if an alias is available
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alias = searchParams.get('alias');

    if (!alias) {
      return NextResponse.json(
        { error: 'Alias parameter is required' },
        { status: 400 }
      );
    }

    // Validate alias format first
    const validation = validateAliasFormat(alias);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        ownedByUser: false,
        error: validation.error
      });
    }

    const availability = await checkAliasAvailability(alias, session.user.id);

    return NextResponse.json({
      available: availability.available,
      ownedByUser: availability.ownedByUser,
      alias: availability.alias?.alias || null,
      message: availability.available 
        ? (availability.ownedByUser ? 'You already own this alias' : 'Alias is available')
        : 'Alias is taken by another user'
    });
  } catch (error) {
    console.error('Error checking alias availability:', error);
    return NextResponse.json(
      { error: 'Failed to check alias availability' },
      { status: 500 }
    );
  }
}
