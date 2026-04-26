import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/database/prisma';
import { FREE_LIMITS } from '@/lib/stripe/subscriptionService';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ isPremium: false });
  }

  const userId = (session as any).userId || (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ isPremium: false });
  }

  const [user, usage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, subscriptionEndsAt: true },
    }),
    prisma.usageTracking.findUnique({
      where: { userId },
      select: {
        responsesThisWeek: true,
        breakdownsToday: true,
        ttsToday: true,
        voiceChatsThisWeek: true,
      },
    }),
  ]);

  const isPremium = user?.subscriptionStatus === 'premium';

  return NextResponse.json({
    isPremium,
    subscriptionStatus: user?.subscriptionStatus ?? 'free',
    subscriptionEndsAt: user?.subscriptionEndsAt ?? null,
    usage: {
      responsesThisWeek: usage?.responsesThisWeek ?? 0,
      breakdownsToday: usage?.breakdownsToday ?? 0,
      ttsToday: usage?.ttsToday ?? 0,
      voiceChatsThisWeek: usage?.voiceChatsThisWeek ?? 0,
    },
    limits: FREE_LIMITS,
  });
}
