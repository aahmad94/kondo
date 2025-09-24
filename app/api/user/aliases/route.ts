import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  createUserAlias,
  switchToAlias,
  getUserAliases,
  validateAliasFormat,
  getCurrentUserAlias
} from '@/lib/user/aliasService';

// GET /api/user/aliases - Get all aliases for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const aliases = await getUserAliases(session.user.id);
    const currentAlias = await getCurrentUserAlias(session.user.id);

    return NextResponse.json({
      aliases,
      currentAlias
    });
  } catch (error) {
    console.error('Error fetching user aliases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aliases' },
      { status: 500 }
    );
  }
}

// POST /api/user/aliases - Create a new alias or switch to existing alias
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { alias, action = 'create' } = body;

    // Validate alias format
    const validation = validateAliasFormat(alias);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (action === 'switch') {
      // Switch to an existing alias
      const result = await switchToAlias(session.user.id, alias);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Successfully switched to alias',
        alias: result.alias
      });
    } else if (action === 'create') {
      // Create a new alias
      const result = await createUserAlias(session.user.id, alias, true);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: 'Successfully created alias',
        alias: result.alias
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "create" or "switch"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error managing user alias:', error);
    return NextResponse.json(
      { error: 'Failed to manage alias' },
      { status: 500 }
    );
  }
}

// PUT /api/user/aliases - Switch to an existing alias
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { alias } = body;

    if (!alias) {
      return NextResponse.json(
        { error: 'Alias is required' },
        { status: 400 }
      );
    }

    const result = await switchToAlias(session.user.id, alias);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Successfully switched to alias',
      alias: result.alias
    });
  } catch (error) {
    console.error('Error switching user alias:', error);
    return NextResponse.json(
      { error: 'Failed to switch alias' },
      { status: 500 }
    );
  }
}
