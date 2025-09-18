import * as amplitude from '@amplitude/analytics-browser';
import { getSession } from 'next-auth/react';

// Initialize Amplitude
export const initAmplitude = (userEmail?: string) => {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn('Amplitude API key is not defined - events will not be tracked');
    return false;
  }
  
  try {
    amplitude.init(apiKey, {
      autocapture: false,
    });
    
    if (userEmail) {
      amplitude.setUserId(userEmail);
      console.log('Amplitude initialized with user email:', userEmail);
    } else {
      console.log('Amplitude initialized without user email');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Amplitude:', error);
    return false;
  }
};

// Event names
export const AmplitudeEvents = {
  BREAKDOWN_CLICK: 'breakdown_click',
  SPEAKER_CLICK: 'speaker_click',
  ADD_TO_DECK: 'add_to_deck',
  CREATE_DECK: 'create_deck',
  CHANGE_RANK: 'change_rank',
  PAUSE_TOGGLE: 'pause_toggle',
  LANGUAGE_CHANGE: 'language_change',
  CLEAR_DECK: 'clear_deck',
  DECK_SELECT: 'deck_select'
} as const;

// Helper function to get user properties
const getUserProperties = async () => {
  try {
    const session = await getSession();
    return {
      user_email: session?.user?.email || 'anonymous'
    };
  } catch (error) {
    console.error('Failed to get user properties:', error);
    return {
      user_email: 'anonymous'
    };
  }
};

// Helper function to track events with error handling
const trackEvent = async (eventName: string, properties: Record<string, any>) => {
  try {
    // Check if Amplitude is initialized
    if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
      console.warn(`Cannot track event "${eventName}": Amplitude API key not configured`);
      return;
    }
    
    const userProps = await getUserProperties();
    const eventProperties = { ...properties, ...userProps };
    
    amplitude.track(eventName, eventProperties);
    
    // Optional: Keep this for debugging, remove for production
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tracking event: ${eventName}`, eventProperties);
    }
    
  } catch (error) {
    console.error(`Failed to track event "${eventName}":`, error);
  }
};

// Event tracking functions
export const trackBreakdownClick = async (responseId: string) => {
  await trackEvent(AmplitudeEvents.BREAKDOWN_CLICK, { responseId });
};

export const trackSpeakerClick = async (responseId: string) => {
  await trackEvent(AmplitudeEvents.SPEAKER_CLICK, { responseId });
};

export const trackAddToDeck = async (responseId: string, deckId: string, deckTitle: string) => {
  await trackEvent(AmplitudeEvents.ADD_TO_DECK, { 
    responseId, 
    deckId, 
    deckTitle
  });
};

export const trackCreateDeck = async (deckId: string, deckTitle: string) => {
  await trackEvent(AmplitudeEvents.CREATE_DECK, { 
    deckId, 
    deckTitle
  });
};

export const trackChangeRank = async (responseId: string, oldRank: number, newRank: number) => {
  await trackEvent(AmplitudeEvents.CHANGE_RANK, { 
    responseId, 
    oldRank, 
    newRank
  });
};

export const trackPauseToggle = async (isPaused: boolean) => {
  await trackEvent(AmplitudeEvents.PAUSE_TOGGLE, { isPaused });
};

export const trackLanguageChange = async (oldLanguage: string, newLanguage: string) => {
  await trackEvent(AmplitudeEvents.LANGUAGE_CHANGE, { 
    oldLanguage, 
    newLanguage
  });
};

export const trackClearDeck = async () => {
  await trackEvent(AmplitudeEvents.CLEAR_DECK, {});
};

export const trackDeckSelect = async (deckId: string | null, deckTitle: string | null) => {
  await trackEvent(AmplitudeEvents.DECK_SELECT, { 
    deckId, 
    deckTitle
  });
};

