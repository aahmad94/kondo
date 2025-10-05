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
export async function getUserStreak(userId: string): Promise<{ currentStreak: number; maxStreak: number; lastActivityDate: Date | null }> {
  const streak = await getOrCreateStreak(userId);
  return {
    currentStreak: streak.currentStreak,
    maxStreak: streak.maxStreak,
    lastActivityDate: streak.lastActivityDate
  };
}

/**
 * Gets the start of day in a specific timezone
 */
function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  const dateStr = date.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(dateStr);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

/**
 * Gets the calendar date string (YYYY-MM-DD) in a specific timezone
 */
function getCalendarDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone }); // en-CA gives YYYY-MM-DD format
}

/**
 * Checks if a date is today in the user's timezone
 */
function isToday(date: Date, timezone: string): boolean {
  const todayStr = getCalendarDateInTimezone(new Date(), timezone);
  const checkDateStr = getCalendarDateInTimezone(date, timezone);
  return todayStr === checkDateStr;
}

/**
 * Checks if a date is yesterday in the user's timezone
 */
function isYesterday(date: Date, timezone: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getCalendarDateInTimezone(yesterday, timezone);
  const checkDateStr = getCalendarDateInTimezone(date, timezone);
  return yesterdayStr === checkDateStr;
}

/**
 * Updates the user's streak when they add a response to a deck
 * Returns streak information including whether this triggers a celebration
 * @param userId - The user's ID
 * @param timezone - The user's timezone (e.g., 'America/New_York', 'Asia/Tokyo'). Defaults to UTC if not provided.
 */
export async function updateStreakOnActivity(userId: string, timezone: string = 'UTC'): Promise<StreakData> {
  const streak = await getOrCreateStreak(userId);
  
  const now = new Date();
  let newCurrentStreak = streak.currentStreak;
  let newMaxStreak = streak.maxStreak;
  let isNewStreak = false;
  let wasStreakBroken = false;

  // Check if this is the user's first activity today (in user's timezone)
  if (!streak.lastActivityDate || !isToday(streak.lastActivityDate, timezone)) {
    // This is the first response added to any deck today
    isNewStreak = true;

    if (!streak.lastActivityDate) {
      // First ever activity
      newCurrentStreak = 1;
    } else if (isYesterday(streak.lastActivityDate, timezone)) {
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
 * @param userId - The user's ID
 * @param timezone - The user's timezone (e.g., 'America/New_York', 'Asia/Tokyo'). Defaults to UTC if not provided.
 */
export async function shouldCelebrateStreak(userId: string, timezone: string = 'UTC'): Promise<boolean> {
  const streak = await getOrCreateStreak(userId);
  
  // Celebrate if they haven't added anything today yet (in user's timezone)
  if (!streak.lastActivityDate || !isToday(streak.lastActivityDate, timezone)) {
    return true;
  }
  
  return false;
}

