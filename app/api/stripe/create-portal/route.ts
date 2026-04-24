import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/database/prisma';
import stripe from '@/lib/stripe/stripeClient';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unable to identify user' }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-portal] Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://kondoai.com';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    const type = err?.type || err?.name;
    const code = err?.code;
    console.error('[create-portal] error:', { message, type, code, raw: err });
    return NextResponse.json(
      { error: message, type, code },
      { status: 500 },
    );
  }
}
