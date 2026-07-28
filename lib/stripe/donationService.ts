import 'server-only';
import prisma from '@/lib/database/prisma';

interface RecordDonationParams {
  stripeSessionId: string;
  amountCents: number;
  currency: string;
  email?: string | null;
  userId?: string | null;
  message?: string | null;
  paymentIntentId?: string | null;
  status?: string;
}

/**
 * Idempotently records a completed donation. Keyed on `stripeSessionId`, so a
 * redelivered `checkout.session.completed` webhook updates the existing row
 * instead of inserting a duplicate.
 */
export async function recordDonation(params: RecordDonationParams): Promise<void> {
  const {
    stripeSessionId,
    amountCents,
    currency,
    email,
    userId,
    message,
    paymentIntentId,
    status = 'succeeded',
  } = params;

  await prisma.donation.upsert({
    where: { stripeSessionId },
    create: {
      stripeSessionId,
      amountCents,
      currency,
      email: email ?? null,
      // Empty string comes from metadata when the donor was logged out.
      userId: userId || null,
      message: message || null,
      stripePaymentIntentId: paymentIntentId ?? null,
      status,
    },
    update: {
      status,
      stripePaymentIntentId: paymentIntentId ?? null,
    },
  });
}
