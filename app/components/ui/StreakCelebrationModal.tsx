'use client';

import { useEffect } from 'react';
import { ConfettiAnimation } from './ConfettiAnimation';

interface StreakCelebrationModalProps {
  isOpen: boolean;
  currentStreak: number;
  maxStreak: number;
  onClose: () => void;
  onNavigateToDeck?: () => void;
  showNavigateButton?: boolean;
}

/**
 * Modal that displays a streak celebration with confetti animation
 * Shows when user adds their first response to a deck for the day
 */
export function StreakCelebrationModal({
  isOpen,
  currentStreak,
  maxStreak,
  onClose,
  onNavigateToDeck,
  showNavigateButton = false,
}: StreakCelebrationModalProps) {
  if (!isOpen) return null;

  const isNewRecord = currentStreak === maxStreak && currentStreak > 1;

  return (
    <>
      {/* Confetti Animation */}
      <ConfettiAnimation />

      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          className="bg-card border border-border rounded-sm p-6 max-w-md w-full mx-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            {/* Emoji */}
            <div className="text-4xl mb-3">
              {isNewRecord ? '🎊' : '🔥'}
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-primary mb-2">
              {currentStreak} Day Streak 🎉
            </h2>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground mb-4">
              {isNewRecord
                ? "New personal record, keep it up 💪"
                : "Great job maintaining your learning streak 👏"}
            </p>

            {/* Stats */}
            <div className="bg-background border border-border rounded-sm p-3 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
                  <p className="text-xl font-bold text-primary">{currentStreak}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Streak</p>
                  <p className="text-xl font-bold text-primary">{maxStreak}</p>
                </div>
              </div>
            </div>

            {/* Encouragement Message */}
            <p className="text-xs text-muted-foreground mb-4">
              Add to your decks again tomorrow to keep your streak going!
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {showNavigateButton && onNavigateToDeck ? (
                <>
                  <button
                    onClick={() => {
                      onNavigateToDeck();
                      onClose();
                    }}
                    className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
                  >
                    Go to Deck
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm bg-muted text-muted-foreground rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Stay Here
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
                >
                  Continue Learning
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

