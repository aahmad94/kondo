import prisma from '@/lib/database/prisma';

export interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastActivityDate: Date | null;
  isNewStreak: boolean;
  wasStreakBroken: boolean;
}

/**
 * Gets or creates a streak record for a user
 */
export async function getOrCreateStreak(userId: string) {
  let streak = await prisma.streak.findUnique({
    where: { userId }
  });

  if (!streak) {
    streak = await prisma.streak.create({
      data: {
        userId,
        currentStreak: 0,
        maxStreak: 0,
        lastActivityDate: null
      }
    });
  }

  return streak;
}

/**
 * Gets the user's current streak information
 */
export async function getUserStreak(userId: string): Promise<{ currentStreak: number; maxStreak: number }> {
  const streak = await getOrCreateStreak(userId);
  return {
    currentStreak: streak.currentStreak,
    maxStreak: streak.maxStreak
  };
}

/**
 * Checks if a date is today (in UTC)
 */
function isToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
}

/**
 * Checks if a date is yesterday (in UTC)
 */
function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === yesterday.getTime();
}

/**
 * Updates the user's streak when they add a response to a deck
 * Returns streak information including whether this triggers a celebration
 */
export async function updateStreakOnActivity(userId: string): Promise<StreakData> {
  const streak = await getOrCreateStreak(userId);
  
  const now = new Date();
  let newCurrentStreak = streak.currentStreak;
  let newMaxStreak = streak.maxStreak;
  let isNewStreak = false;
  let wasStreakBroken = false;

  // Check if this is the user's first activity today
  if (!streak.lastActivityDate || !isToday(streak.lastActivityDate)) {
    // This is the first response added to any deck today
    isNewStreak = true;

    if (!streak.lastActivityDate) {
      // First ever activity
      newCurrentStreak = 1;
    } else if (isYesterday(streak.lastActivityDate)) {
      // Continuing the streak from yesterday
      newCurrentStreak = streak.currentStreak + 1;
    } else {
      // Streak was broken, start over
      newCurrentStreak = 1;
      if (streak.currentStreak > 0) {
        wasStreakBroken = true;
      }
    }

    // Update max streak if current exceeds it
    if (newCurrentStreak > streak.maxStreak) {
      newMaxStreak = newCurrentStreak;
    }

    // Update the streak in the database
    await prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        lastActivityDate: now,
        updatedAt: now
      }
    });
  }

  return {
    currentStreak: newCurrentStreak,
    maxStreak: newMaxStreak,
    lastActivityDate: streak.lastActivityDate,
    isNewStreak,
    wasStreakBroken
  };
}

/**
 * Checks if adding a response today would trigger a streak celebration
 * (i.e., this is the first response added to any deck today)
 */
export async function shouldCelebrateStreak(userId: string): Promise<boolean> {
  const streak = await getOrCreateStreak(userId);
  
  // Celebrate if they haven't added anything today yet
  if (!streak.lastActivityDate || !isToday(streak.lastActivityDate)) {
    return true;
  }
  
  return false;
}

