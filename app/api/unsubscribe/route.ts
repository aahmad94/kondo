import { NextRequest, NextResponse } from 'next/server';
import { validateUnsubscribeToken, unsubscribeUserFromEmails, unsubscribeFromLanguage } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { token, unsubscribeAll } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    // Validate the token and get userId and languageCode
    const tokenData = await validateUnsubscribeToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token. The link may have expired (tokens are valid for 30 days).' },
        { status: 400 }
      );
    }

    const { userId, languageCode } = tokenData;

    // Unsubscribe based on preference
    if (unsubscribeAll || languageCode === 'all') {
      // Unsubscribe from all languages
      await unsubscribeUserFromEmails(userId);
      return NextResponse.json(
        { 
          message: 'You have been successfully unsubscribed from all Kondo emails.',
          languageCode: 'all'
        },
        { status: 200 }
      );
    } else {
      // Unsubscribe from specific language only
      await unsubscribeFromLanguage(userId, languageCode);
      return NextResponse.json(
        { 
          message: `You have been successfully unsubscribed from ${languageCode.toUpperCase()} emails.`,
          languageCode
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again later.' },
      { status: 500 }
    );
  }
}

