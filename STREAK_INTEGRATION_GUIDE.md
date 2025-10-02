# Streak Feature Integration Guide

This guide explains how to integrate the streak celebration feature into your UI components.

## Overview

The streak feature tracks daily user activity when they add responses to decks. When a user adds their first response to any deck for the day, a celebration modal appears with confetti animation.

## Components Created

1. **StreakCelebrationModal** - The celebration modal with streak stats
2. **ConfettiAnimation** - Canvas-based confetti animation
3. **streakService** - Backend service for streak logic

## Integration Steps

### 1. Import Required Components

```typescript
import { StreakCelebrationModal } from '@/app/components/ui';
import { useState } from 'react';
```

### 2. Add State Management

In your component (e.g., `ChatBox.tsx` or wherever responses are created):

```typescript
const [showStreakCelebration, setShowStreakCelebration] = useState(false);
const [streakData, setStreakData] = useState<{
  currentStreak: number;
  maxStreak: number;
} | null>(null);
```

### 3. Handle Response Creation/Import

After creating a response or importing from community, check the returned streak data:

#### For GPTResponse Creation:
```typescript
// When calling the API
const response = await fetch('/api/createGPTResponse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content, userId, bookmarkId })
});

const result = await response.json();

// Check if streak should be celebrated
if (result.streakData?.isNewStreak) {
  setStreakData({
    currentStreak: result.streakData.currentStreak,
    maxStreak: result.streakData.maxStreak
  });
  setShowStreakCelebration(true);
}
```

#### For addResponseToBookmark API:
```typescript
const response = await fetch('/api/addResponseToBookmark', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bookmarkId, gptResponseContent, userId, ... })
});

const result = await response.json();

// Check if streak should be celebrated
if (result.streakData?.isNewStreak) {
  setStreakData({
    currentStreak: result.streakData.currentStreak,
    maxStreak: result.streakData.maxStreak
  });
  setShowStreakCelebration(true);
}
```

#### For Community Imports:
```typescript
// After importing from community
const result = await importCommunityResponseAction(communityResponseId);

if (result.success && result.streakData?.isNewStreak) {
  setStreakData({
    currentStreak: result.streakData.currentStreak,
    maxStreak: result.streakData.maxStreak
  });
  setShowStreakCelebration(true);
}
```

### 4. Add the Modal to Your JSX

Add the modal component near the end of your component's return statement:

```typescript
return (
  <div>
    {/* Your existing UI */}
    
    {/* Streak Celebration Modal */}
    {streakData && (
      <StreakCelebrationModal
        isOpen={showStreakCelebration}
        currentStreak={streakData.currentStreak}
        maxStreak={streakData.maxStreak}
        onClose={() => setShowStreakCelebration(false)}
      />
    )}
  </div>
);
```

## Backend Changes Made

### Database Schema
- Added `Streak` table with fields:
  - `userId` (unique)
  - `currentStreak`
  - `maxStreak`
  - `lastActivityDate`

### Services Updated
- **`streakService.ts`**: Core streak logic
  - `updateStreakOnActivity()`: Updates streak when response is added
  - `getUserStreak()`: Fetches user's streak data
  - `shouldCelebrateStreak()`: Checks if celebration should trigger

### APIs Updated
- **`/api/createGPTResponse`**: Returns `{ response, streakData }`
- **`/api/addResponseToBookmark`**: Returns `{ response, streakData }`
- **`/api/getUserStreak`**: New endpoint to fetch streak data
- **Community import functions**: All return `streakData` in response

### Stats Modal
The existing stats modal now displays streak information at the top:
```
Streak (days) 🔥
current         5
best            7

Rank composition
hard            12  25%
medium          20  42%
easy            16  33%
total           48
```

## Behavior

- **Streak increments**: When user adds first response to ANY deck for the day
- **Streak continues**: If added response yesterday and today
- **Streak resets**: If no responses added yesterday (breaks to 1)
- **Max streak**: Automatically tracked when current exceeds it
- **Celebration**: Only shows on first response of the day (not subsequent)

## Example Integration Locations

You'll likely want to integrate this in:
1. **`ChatBox.tsx`** - Main chat interface where users create responses
2. **Community feed components** - When importing responses
3. **Any component that calls** - `/api/createGPTResponse` or `/api/addResponseToBookmark`

## Testing

To test the streak feature:
1. Add a response to any deck (bookmark)
2. Celebration modal should appear with confetti
3. Check stats modal - streak should be 1
4. Wait until tomorrow (or manually update `lastActivityDate` in DB)
5. Add another response - streak should increment to 2

## Notes

- Streak is calculated in **UTC timezone** to ensure consistency
- Only responses added to **bookmarks (decks)** count toward streaks
- Responses without bookmarks do NOT trigger streak updates
- The confetti animation lasts 4 seconds
- The modal auto-closes after 4 seconds but can be manually closed

