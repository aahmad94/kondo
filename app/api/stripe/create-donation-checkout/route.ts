import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import stripe from '@/lib/stripe/stripeClient';
import { getOrCreateStripeCustomer } from '@/lib/stripe/subscriptionService';
import {
  isValidDonationCents,
  DONATION_MESSAGE_MAX,
} from '@/lib/stripe/donationConstants';

/**
 * Creates a one-time "Buy me a coffee" Stripe Checkout session.
 *
 * Auth is optional — anonymous visitors can donate. When a session exists we
 * attach the Stripe customer and stamp `userId` into metadata so the webhook
 * can link the donation to the account.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-donation-checkout] Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    if (!process.env.STRIPE_DONATION_PRODUCT_ID) {
      console.error('[create-donation-checkout] Missing STRIPE_DONATION_PRODUCT_ID');
      return NextResponse.json(
        { error: 'Server misconfiguration: missing donation product id' },
        { status: 500 },
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty/invalid body — validated below
    }

    // Never trust the client's amount: must be a whole-cent integer in range.
    const amountCents = Number(body?.amountCents);
    if (!isValidDonationCents(amountCents)) {
      return NextResponse.json({ error: 'Invalid donation amount' }, { status: 400 });
    }

    const message =
      typeof body?.message === 'string'
        ? body.message.trim().slice(0, DONATION_MESSAGE_MAX)
        : '';

    const session = await getServerSession(authOptions);
    const userId = session
      ? ((session as any).userId || (session.user as any)?.id || null)
      : null;
    const email = session?.user?.email ?? undefined;

    let customerId: string | undefined;
    if (userId && email) {
      customerId = await getOrCreateStripeCustomer(userId, email);
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://kondoai.com';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      // A customer and customer_email are mutually exclusive.
      ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            // References the price-less donation product; amount is inline so any
            // value works from a single product.
            product: process.env.STRIPE_DONATION_PRODUCT_ID,
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      // Relabels Checkout's submit button to "Donate".
      submit_type: 'donate',
      success_url: `${baseUrl}/?donate=success`,
      cancel_url: `${baseUrl}/?donate=canceled`,
      metadata: {
        kind: 'donation',
        userId: userId ?? '',
        message,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    const messageText = err?.message || 'Unknown error';
    const type = err?.type || err?.name;
    const code = err?.code;
    console.error('[create-donation-checkout] error:', { message: messageText, type, code, raw: err });
    return NextResponse.json({ error: messageText, type, code }, { status: 500 });
  }
}
