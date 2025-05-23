import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../pages/api/auth/[...nextauth]';
import { fuzzySearchResponses } from '../../../lib/searchService';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in search API:', session);

    if (!session?.userId) {
      console.log('No user ID in session:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const languageCode = searchParams.get('languageCode');

    if (!query || !languageCode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const results = await fuzzySearchResponses(query, session.userId, languageCode);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 