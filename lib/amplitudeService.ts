import * as amplitude from '@amplitude/analytics-browser';
import { getSession } from 'next-auth/react';

// Initialize Amplitude
export const initAmplitude = (userEmail?: string) => {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn('Amplitude API key is not defined');
    return;
  }
  amplitude.init(apiKey, {
    autocapture: false,
  });
  if (userEmail) {
    amplitude.setUserId(userEmail);
  }
};

// Event names
export const AmplitudeEvents = {
  BREAKDOWN_CLICK: 'breakdown_click',
  SPEAKER_CLICK: 'speaker_click',
  ADD_TO_BOOKMARK: 'add_to_bookmark',
  CREATE_BOOKMARK: 'create_bookmark',
  CHANGE_RANK: 'change_rank',
  PAUSE_TOGGLE: 'pause_toggle',
  LANGUAGE_CHANGE: 'language_change',
  CLEAR_BOOKMARK: 'clear_bookmark',
  BOOKMARK_SELECT: 'bookmark_select'
} as const;

// Helper function to get user properties
const getUserProperties = async () => {
  const session = await getSession();
  return {
    user_email: session?.user?.email || 'anonymous'
  };
};

// Event tracking functions
export const trackBreakdownClick = async (responseId: string) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.BREAKDOWN_CLICK, { 
    responseId,
    ...userProps
  });
};

export const trackSpeakerClick = async (responseId: string) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.SPEAKER_CLICK, { 
    responseId,
    ...userProps
  });
};

export const trackAddToBookmark = async (responseId: string, bookmarkId: string, bookmarkTitle: string) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.ADD_TO_BOOKMARK, { 
    responseId, 
    bookmarkId, 
    bookmarkTitle,
    ...userProps
  });
};

export const trackCreateBookmark = async (bookmarkId: string, bookmarkTitle: string) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.CREATE_BOOKMARK, { 
    bookmarkId, 
    bookmarkTitle,
    ...userProps
  });
};

export const trackChangeRank = async (responseId: string, oldRank: number, newRank: number) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.CHANGE_RANK, { 
    responseId, 
    oldRank, 
    newRank,
    ...userProps
  });
};

export const trackPauseToggle = async (isPaused: boolean) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.PAUSE_TOGGLE, { 
    isPaused,
    ...userProps
  });
};

export const trackLanguageChange = async (oldLanguage: string, newLanguage: string) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.LANGUAGE_CHANGE, { 
    oldLanguage, 
    newLanguage,
    ...userProps
  });
};

export const trackClearBookmark = async () => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.CLEAR_BOOKMARK, userProps);
};

export const trackBookmarkSelect = async (bookmarkId: string | null, bookmarkTitle: string | null) => {
  const userProps = await getUserProperties();
  amplitude.track(AmplitudeEvents.BOOKMARK_SELECT, { 
    bookmarkId, 
    bookmarkTitle,
    ...userProps
  });
};