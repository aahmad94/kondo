import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { fuzzySearchResponses } from '../../lib/searchService';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const languageId = searchParams.get('languageId');

    if (!query || !languageId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const responses = await fuzzySearchResponses(query, session.userId, languageId);
    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 