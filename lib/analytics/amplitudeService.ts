import * as amplitude from '@amplitude/analytics-browser';
import { getSession } from 'next-auth/react';

/** Current selected language code, attached to every Amplitude event. */
let currentLanguage: string | null = null;

/**
 * Update the language code that will be included on subsequent Amplitude events.
 * Call this whenever the user's selected language is loaded or changes.
 */
export const setAnalyticsLanguage = (languageCode: string | null | undefined) => {
  currentLanguage = languageCode || null;
};

export const getAnalyticsLanguage = (): string | null => currentLanguage;

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
    }

    // Hydrate language from localStorage if not already set (e.g. before React state loads)
    if (!currentLanguage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('preferredLanguage');
        if (stored) {
          const { code } = JSON.parse(stored);
          if (code) currentLanguage = code;
        }
      } catch {
        // ignore corrupt localStorage
      }
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
  DECK_SELECT: 'deck_select',
  DONATE_MODAL_OPEN: 'donate_modal_open',
  DONATE_CHECKOUT_START: 'donate_checkout_start',
  /** User imported a community response (or batch) into a bookmark/deck */
  COMMUNITY_IMPORT: 'community_import',
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

/** Common properties attached to every event (language + identity). */
const getCommonEventProperties = async () => {
  const userProps = await getUserProperties();
  return {
    ...userProps,
    selectedLanguage: currentLanguage || 'unknown',
  };
};

// Helper function to track events with error handling
const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  try {
    // Check if Amplitude is initialized
    if (!process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
      console.warn(`Cannot track event "${eventName}": Amplitude API key not configured`);
      return;
    }
    
    const commonProps = await getCommonEventProperties();
    const eventProperties = { ...commonProps, ...properties };
    
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
export const trackBreakdownClick = async (
  responseId: string,
  options?: { isCommunityResponse?: boolean; isCommunityImport?: boolean }
) => {
  await trackEvent(AmplitudeEvents.BREAKDOWN_CLICK, {
    responseId,
    isCommunityResponse: options?.isCommunityResponse ?? false,
    isCommunityImport: options?.isCommunityImport ?? false,
  });
};

export const trackSpeakerClick = async (
  responseId: string,
  options?: { isCommunityResponse?: boolean; isCommunityImport?: boolean }
) => {
  await trackEvent(AmplitudeEvents.SPEAKER_CLICK, {
    responseId,
    isCommunityResponse: options?.isCommunityResponse ?? false,
    isCommunityImport: options?.isCommunityImport ?? false,
  });
};

/**
 * Track when a user adds a response to a bookmark (deck).
 * `isCommunityImport` is true when the add path is importing a community response.
 */
export const trackAddToDeck = async (
  responseId: string | null | undefined,
  deckId: string,
  deckTitle: string,
  options?: { isCommunityImport?: boolean }
) => {
  await trackEvent(AmplitudeEvents.ADD_TO_DECK, {
    responseId: responseId ?? null,
    deckId,
    deckTitle,
    isCommunityImport: options?.isCommunityImport ?? false,
  });
};

export const trackCreateDeck = async (deckId: string, deckTitle: string) => {
  await trackEvent(AmplitudeEvents.CREATE_DECK, {
    deckId,
    deckTitle,
  });
};

export const trackChangeRank = async (
  responseId: string,
  oldRank: number,
  newRank: number,
  options?: { isCommunityResponse?: boolean; isCommunityImport?: boolean }
) => {
  await trackEvent(AmplitudeEvents.CHANGE_RANK, {
    responseId,
    oldRank,
    newRank,
    isCommunityResponse: options?.isCommunityResponse ?? false,
    isCommunityImport: options?.isCommunityImport ?? false,
  });
};

export const trackPauseToggle = async (
  isPaused: boolean,
  options?: { isCommunityResponse?: boolean; isCommunityImport?: boolean }
) => {
  await trackEvent(AmplitudeEvents.PAUSE_TOGGLE, {
    isPaused,
    isCommunityResponse: options?.isCommunityResponse ?? false,
    isCommunityImport: options?.isCommunityImport ?? false,
  });
};

export const trackLanguageChange = async (oldLanguage: string, newLanguage: string) => {
  // Keep module language in sync so subsequent events use the new value
  setAnalyticsLanguage(newLanguage);
  await trackEvent(AmplitudeEvents.LANGUAGE_CHANGE, {
    oldLanguage,
    newLanguage,
  });
};

export const trackClearDeck = async () => {
  await trackEvent(AmplitudeEvents.CLEAR_DECK, {});
};

export const trackDeckSelect = async (deckId: string | null, deckTitle: string | null) => {
  await trackEvent(AmplitudeEvents.DECK_SELECT, {
    deckId,
    deckTitle,
    isCommunityFeature: deckTitle === 'community',
  });
};

export const trackDonateModalOpen = async (source: 'menubar-cta' | 'dropdown') => {
  await trackEvent(AmplitudeEvents.DONATE_MODAL_OPEN, { source });
};

export const trackDonateCheckoutStart = async (amountCents: number) => {
  await trackEvent(AmplitudeEvents.DONATE_CHECKOUT_START, { amountCents });
};

export type CommunityImportType = 'single' | 'batch' | 'single_to_bookmark';

/**
 * Track when a user imports a community response (or an entire community bookmark)
 * into one of their own bookmarks/decks.
 */
export const trackCommunityImport = async (properties: {
  communityResponseId: string;
  bookmarkId?: string | null;
  bookmarkTitle?: string | null;
  importType: CommunityImportType;
  isBatch?: boolean;
  importedCount?: number | null;
  wasBookmarkCreated?: boolean;
  success?: boolean;
}) => {
  await trackEvent(AmplitudeEvents.COMMUNITY_IMPORT, {
    communityResponseId: properties.communityResponseId,
    bookmarkId: properties.bookmarkId ?? null,
    bookmarkTitle: properties.bookmarkTitle ?? null,
    importType: properties.importType,
    isBatch: properties.isBatch ?? properties.importType === 'batch',
    importedCount: properties.importedCount ?? (properties.importType === 'batch' ? null : 1),
    wasBookmarkCreated: properties.wasBookmarkCreated ?? false,
    success: properties.success ?? true,
    isCommunityImport: true,
  });
};
