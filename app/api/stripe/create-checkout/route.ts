import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/database/prisma';
import stripe from '@/lib/stripe/stripeClient';
import { getOrCreateStripeCustomer } from '@/lib/stripe/subscriptionService';

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
      console.error('[create-checkout] Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
      console.error('[create-checkout] Missing STRIPE_PREMIUM_PRICE_ID');
      return NextResponse.json({ error: 'Server misconfiguration: missing price id' }, { status: 500 });
    }

    // Check if the user is already premium
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, email: true },
    });

    if (user?.subscriptionStatus === 'premium') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    const email = user?.email || session.user.email;
    const customerId = await getOrCreateStripeCustomer(userId, email);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://kondoai.com';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/?upgrade=success`,
      cancel_url: `${baseUrl}/?upgrade=canceled`,
      metadata: { userId },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    const type = err?.type || err?.name;
    const code = err?.code;
    console.error('[create-checkout] error:', { message, type, code, raw: err });
    return NextResponse.json(
      { error: message, type, code },
      { status: 500 },
    );
  }
}
