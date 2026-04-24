import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  _stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
  });
  return _stripe;
}

// Proxy so existing `stripe.customers.create(...)` / `stripe.checkout.sessions.create(...)` call sites
// keep working, while the underlying client is instantiated lazily on first use.
const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client as unknown as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default stripe;
