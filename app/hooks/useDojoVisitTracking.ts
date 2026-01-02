'use client';

import { useEffect, useRef, useState } from 'react';

interface StreakData {
  currentStreak: number;
  maxStreak: number;
}

interface UseDojoVisitTrackingReturn {
  showStreakCelebration: boolean;
  streakData: StreakData | null;
  setShowStreakCelebration: (show: boolean) => void;
  setStreakData: (data: StreakData | null) => void;
}

/**
 * Custom hook to track Dojo visits for streak counting.
 * Automatically tracks the first visit to the Dojo page each day and updates the user's streak.
 * 
 * @param userId - The user's ID
 * @param selectedDeckTitle - The currently selected deck title (should be 'daily summary' for Dojo)
 * @returns Streak celebration state and handlers
 */
export function useDojoVisitTracking(
  userId: string | undefined,
  selectedDeckTitle: string | null
): UseDojoVisitTrackingReturn {
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  
  // Track if we've already tracked Dojo visit today to avoid duplicate API calls
  const dojoVisitTrackedRef = useRef(false);
  const lastDojoVisitDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Only proceed if we have a userId and are on the Dojo page
    if (!userId || selectedDeckTitle !== 'daily summary') {
      return;
    }

    // Get today's date string in user's timezone to check if we've already tracked today
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone });

    // Only track if we haven't tracked today yet (check both the ref and the date)
    const shouldTrack = !dojoVisitTrackedRef.current || lastDojoVisitDateRef.current !== todayStr;
    
    if (shouldTrack) {
      dojoVisitTrackedRef.current = true;
      lastDojoVisitDateRef.current = todayStr;

      // Track Dojo visit and update streak
      fetch('/api/dojo-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          timezone: userTimezone
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.streakData?.isNewStreak) {
            // Show streak celebration if this is a new streak
            setStreakData({
              currentStreak: data.streakData.currentStreak,
              maxStreak: data.streakData.maxStreak
            });
            setShowStreakCelebration(true);
          }
        })
        .catch(error => {
          console.error('Error tracking Dojo visit:', error);
          // Reset tracking on error so we can retry if needed
          dojoVisitTrackedRef.current = false;
        });
    }
  }, [userId, selectedDeckTitle]);

  return {
    showStreakCelebration,
    streakData,
    setShowStreakCelebration,
    setStreakData
  };
}

