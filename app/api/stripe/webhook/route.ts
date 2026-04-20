import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe/stripeClient';
import { syncSubscriptionFromStripe } from '@/lib/stripe/subscriptionService';

// Required: disable Next.js body parsing so we can verify the raw Stripe signature
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEventAsync> extends Promise<infer T> ? T : never;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status === 'active' ? 'premium' : 'free';
        const priceId = subscription.items.data[0]?.price?.id;
        // current_period_end is on the billing cycle anchor in Stripe v22
        const periodEnd = (subscription as any).current_period_end as number | undefined;
        const endsAt = periodEnd ? new Date(periodEnd * 1000) : undefined;

        await syncSubscriptionFromStripe(customerId, status as any, subscription.id, priceId, endsAt);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        await syncSubscriptionFromStripe(customerId, 'canceled', subscription.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (subscriptionId) {
          await syncSubscriptionFromStripe(customerId, 'premium', subscriptionId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        await syncSubscriptionFromStripe(customerId, 'past_due');
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    return NextResponse.json({ error: 'Failed to process webhook event' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
