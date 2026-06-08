import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  checkVoiceChatQuota,
  incrementVoiceChatUsage,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';

export const runtime = 'nodejs';

const XAI_CLIENT_SECRETS_URL = 'https://api.x.ai/v1/realtime/client_secrets';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session?.user as any)?.id;

    // Enforce weekly voice chat quota for authenticated users
    if (userId) {
      const quota = await checkVoiceChatQuota(userId);
      if (!quota.allowed) {
        return NextResponse.json(quotaExceededResponse('voice', quota), { status: 429 });
      }
    }

    const apiKey = process.env.XAI_VOICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Voice API is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const responseText: string = typeof body?.responseText === 'string' ? body.responseText : '';
    const language: string = typeof body?.language === 'string' ? body.language : 'en';

    // Keep system prompt scoped tightly to the referenced GPT response.
    const instructions = [
      'You are a focused voice tutor for language learning.',
      'Only respond to questions the user asks about the CONTENT provided below.',
      'If the user asks anything vastly unrelated to the content, politely decline and steer them back to that content.',
      'Keep answers concise, conversational, and speak in the same language the user uses.',
      '',
      'PRONUNCIATION CHECK MODE:',
      'If the user appears to be repeating or reading aloud the phrase/content (rather than asking a question), treat it as a pronunciation test.',
      'Don\'t repeat the phrase/content back to the user, be as concise as possible.',
      'If the user has not indicated which language they are speaking (e.g. any language other than the language of the content), BY DEFAULT, REPLY IN ENGLISH (VERY IMPORTANT) BUT IF YOU\'RE QUOTING THE FOREIGN LANGUAGE CONTENT, REPLY THAT PART IN THE FOREIGN LANGUAGE.',
      'Tell them whether their pronunciation is correct, rate it from 1 to 10.', 
      'ONLY IF THE RATING IS BELOW 7, point out specific words or syllables that were off (but don\'t be too picky, understand that there\'s noise in the audio) and give a concise, friendly critique with the correct pronunciation if needed.',
      'Be encouraging and specific — mention accents, intonation, elongation, and common pitfalls when relevant but prioritize being concise and helpful.',
      'IF THE RATING IS ABOVE 7, JUST SAY "YOUR PRONUNCIATION IS CORRECT" AND BE CONCISE.',
      '--- REFERENCED CONTENT START ---',
      responseText || '(no content provided)',
      '--- REFERENCED CONTENT END ---',
    ].join('\n');

    const res = await fetch(XAI_CLIENT_SECRETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
        session: {
          model: 'grok-voice-think-fast-1.0',
          voice: 'eve',
          instructions,
          turn_detection: { type: 'server_vad' },
          audio: {
            input: { format: { type: 'audio/pcm', rate: 24000 } },
            output: { format: { type: 'audio/pcm', rate: 24000 } },
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('xAI client_secrets failed:', res.status, errText);
      return NextResponse.json(
        { error: 'Failed to create voice session' },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Count a successful session mint toward the weekly voice chat quota
    if (userId) {
      await incrementVoiceChatUsage(userId);
    }

    return NextResponse.json({
      value: data.value,
      expires_at: data.expires_at,
      instructions,
      model: 'grok-voice-think-fast-1.0',
    });
  } catch (error: any) {
    console.error('Error creating xAI voice session:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create voice session' },
      { status: 500 }
    );
  }
}
