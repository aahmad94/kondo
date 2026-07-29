import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { exportDeckToCsv, exportAllResponsesToCsv } from '@/lib/export';

// The "all responses" view has no bookmark row behind it — it comes through
// with this synthetic id and exports every deck at once.
const ALL_RESPONSES_ID = 'all';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');

    if (!deckId) {
      return NextResponse.json({ error: 'Missing required parameter: deckId' }, { status: 400 });
    }

    const result = deckId === ALL_RESPONSES_ID
      ? await exportAllResponsesToCsv(session.userId)
      : await exportDeckToCsv(session.userId, deckId);

    if (!result) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Leading BOM so Excel opens the file as UTF-8 and renders the phrases
    // rather than mojibake.
    return new NextResponse(`\uFEFF${result.csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting deck to CSV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
