'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react"
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import UserInput from './UserInput';
import GPTResponse from './GPTResponse';
import CommunityResponse from './CommunityResponse';
import FilterBar from './FilterBar';
import CreateAliasModal from './CreateAliasModal';
import DecksModal from './DecksModal';
import ConfirmationModal from './ui/ConfirmationModal';
import { getLanguageInstructions } from '@/lib/user';
import SearchBar from './SearchBar';
import { trackBreakdownClick, trackPauseToggle, trackChangeRank } from '@/lib/analytics';
import { extractExpressions, createAliasColorMap, getAliasColor } from '@/lib/utils';
import ChatBoxMenuBar from './ChatBoxMenuBar';
import FlashcardModal from './FlashcardModal';
import QuoteBar from './QuoteBar';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import { useUserAlias } from '../contexts/UserAliasContext';
import { 
  shareResponseToCommunityAction, 
  importCommunityResponseAction,
  importCommunityResponseToBookmarkAction,
  importEntireCommunityBookmarkAction,
  checkResponseSharedAction,
  deleteCommunityResponseAction
} from '@/actions/community';
import type { 
  CommunityResponseWithRelations, 
  CommunityFilters
} from '@/lib/community';
import type {
  GPTResponseData,
  CommunityResponseData
} from '../../types/response';

interface ChatBoxProps {
  selectedDeck: { id: string | null, title: string | null };
  reservedDeckTitles: string[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  onDeckSelect: (id: string | null, title: string | null) => void;
  onDeckCreated: (newDeck: { id: string, title: string }) => void;
  isDecksCollapsed: boolean;
  onDecksRefresh?: () => void;
}

interface Response {
  id: string | null;
  content: string;
  rank: number;
  isPaused?: boolean;
  decks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  source?: 'local' | 'imported';
  communityResponseId?: string | null;
  communityResponse?: {
    id: string;
    isActive: boolean;
    creatorAlias: string;
  } | null;
  isSharedToCommunity?: boolean;
  onDeckCreated?: (newBookmark: { id: string, title: string }) => void;
}

interface BookmarkResponse {
  id: string;
  content: string;
  rank: number;
  isPaused?: boolean;
  decks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  source?: 'local' | 'imported';
  communityResponseId?: string | null;
  communityResponse?: {
    id: string;
    isActive: boolean;
    creatorAlias: string;
  } | null;
  isSharedToCommunity?: boolean;
}

// Add sortResponses function
const sortResponses = (responses: Response[]): Response[] => {
  return responses.sort((a: Response, b: Response) => {
    // First sort by rank (ascending: 1, 2, 3)
    const rankComparison = a.rank - b.rank;
    if (rankComparison !== 0) return rankComparison;
    // Within same rank, sort by updatedAt (newest first)
    const updatedAtComparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    const createdAtComparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (updatedAtComparison !== 0) return updatedAtComparison;
    return createdAtComparison;
  });
};

export default function ChatBox({ 
  selectedDeck, 
  reservedDeckTitles,
  selectedLanguage,
  onLanguageChange,
  onDeckSelect,
  onDeckCreated,
  isDecksCollapsed,
  onDecksRefresh
}: ChatBoxProps) {
  const { data: session, status } = useSession()
  const router = useRouter();
  const { isMobile, mobileOffset } = useIsMobile();
  
  // Mode detection
  const isCommunityMode = selectedDeck.title === 'community';
  
  // Personal mode state
  const [bookmarkResponses, setBookmarkResponses] = useState<Record<string, Response>>({});
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [responseQuote, setResponseQuote] = useState<string|null>(null);
  const [userInputOffset, setUserInputOffset] = useState<number>(0);
  
  // Community mode state and hooks
  const {
    responses: communityResponses,
    loading: communityLoading,
    error: communityError,
    hasMore: communityHasMore,
    totalCount: communityTotalCount,
    refetch: refetchCommunity,
    refetchFresh: refetchCommunityFresh,
    loadMore: loadMoreCommunity,
    updateFilters: updateCommunityFilters,
    updateResponse: updateCommunityResponse,
    shuffleResponses: shuffleCommunityResponses,
    filters: communityFilters
  } = useCommunityFeed();

  // User alias hook for refreshing MenuBar state
  const { refreshData: refreshUserAliasData } = useUserAlias();

  const [quoteBarHeight, setQuoteBarHeight] = useState<number>(0);
  const [instructions, setInstructions] = useState({ main: '', dailySummary: '', dojoDetailed: '' });
  const [dailySummaryCache, setDailySummaryCache] = useState<Record<string, Response> | null>(null);
  const [searchResultsCache, setSearchResultsCache] = useState<Record<string, Response> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryTimestamp, setSummaryTimestamp] = useState<Date | null>(null);
  // Add ref to track previous language
  const previousLanguageRef = useRef(selectedLanguage);
  // Add ref to track ongoing rank updates to prevent duplicates
  const ongoingRankUpdatesRef = useRef<Set<string>>(new Set());
  // Add ref to track previous bookmark to detect community mode entry
  const previousBookmarkRef = useRef(selectedDeck.title);
  // Flashcard mode state
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [flashcardResponses, setFlashcardResponses] = useState<Response[]>([]);
  
  // Alias modal state
  const [isCreateAliasModalOpen, setIsCreateAliasModalOpen] = useState(false);
  
  // Pending share state - stores info about the GPTResponse user tried to share before having an alias
  const [pendingShare, setPendingShare] = useState<{
    responseId: string;
    deckTitle: string;
  } | null>(null);
  
  // Success modal state
  const [showShareSuccessModal, setShowShareSuccessModal] = useState(false);
  const [showAlreadySharedModal, setShowAlreadySharedModal] = useState(false);
  const [showSelfImportModal, setShowSelfImportModal] = useState(false);
  const [showShareAfterAliasSuccessModal, setShowShareAfterAliasSuccessModal] = useState(false);
  const [showShareAfterAliasFailureModal, setShowShareAfterAliasFailureModal] = useState(false);
  const [showImportSuccessModal, setShowImportSuccessModal] = useState(false);
  const [showImportErrorModal, setShowImportErrorModal] = useState(false);
  const [importedBookmarkTitle, setImportedBookmarkTitle] = useState('');
  const [importErrorMessage, setImportErrorMessage] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [communityImportModal, setCommunityImportModal] = useState<{
    isOpen: boolean;
    communityResponse: any;
  }>({ isOpen: false, communityResponse: null });
  const [sharedResponseTitle, setSharedResponseTitle] = useState('');
  const [selectedCommunityDeckTitle, setSelectedCommunityDeckTitle] = useState<string | null>(null);

  // Keep flashcard responses in sync with bookmark responses when modal is open
  useEffect(() => {
    if (isFlashcardModalOpen) {
      setFlashcardResponses(getFlashcardResponses());
    }
  }, [bookmarkResponses, isFlashcardModalOpen]);


  // Refetch fresh community data when entering community mode
  useEffect(() => {
    const currentBookmark = selectedDeck.title;
    const previousBookmark = previousBookmarkRef.current;
    
    // If we just entered community mode, fetch fresh data
    if (currentBookmark === 'community' && previousBookmark !== 'community') {
      console.log('Entering community mode - fetching fresh data');
      refetchCommunityFresh();
    }
    
    // Update ref for next comparison
    previousBookmarkRef.current = currentBookmark;
  }, [selectedDeck.title, refetchCommunityFresh]);

  // Update instructions when language changes
  useEffect(() => {
    const updateInstructions = async () => {
      if (session?.userId) {
        const languageInstructions = await getLanguageInstructions(session.userId, selectedLanguage);
        setInstructions(languageInstructions);
        // Only clear responses if the language actually changed
        if (selectedLanguage !== previousLanguageRef.current) {
          // Clear ChatBox responses and URL params
          setResponses({});
          // Clear search and dojo caches
          setSearchResultsCache(null);
          setDailySummaryCache(null);
          setSearchQuery('');
          router.push('/');
          // Update the previous language
          previousLanguageRef.current = selectedLanguage;
        }
      }
    };
    updateInstructions();
  }, [session, selectedLanguage]);


  // When the selected bookmark changes, fetch the responses
  useEffect(() => {
    // Only proceed if we have a session
    if (!session?.userId) return;

    // If we have a selected bookmark, fetch its responses
    if (selectedDeck.id) {
      // Clear any pending quote when selecting a bookmark
      setResponseQuote(null);
      
      if (selectedDeck.id === "all") {
        fetchAllResponses(session.userId);
      } else if (selectedDeck.title === 'daily summary') {
        // Use cached summary if available, otherwise fetch
        if (dailySummaryCache) {
          setBookmarkResponses(dailySummaryCache);
        } else {
          handleGenerateSummary(false);
        }
      } else {
        fetchBookmarkResponses(session.userId, selectedDeck.id);
      }
    }
    // Only clear responses if we explicitly don't have a selected bookmark
    else if (selectedDeck.id === null) {
      setBookmarkResponses({});
    }
  }, [selectedDeck, selectedLanguage]);

  // Scroll to bottom when new responses are added or quote is clicked in main chat
  useEffect(() => {
    if (!selectedDeck.id && (Object.values(responses).length > 0 || responseQuote)) {
      scrollToBottom();
    }
  }, [responses, responseQuote, selectedDeck.id]);


  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current && selectedDeck.title && !reservedDeckTitles.includes(selectedDeck.title)) {
        chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
        });
      } else if (chatContainerRef.current && !selectedDeck.title) {
        chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
        });
      }

      }, 500);
  }


  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: 0,
        behavior: 'auto'
      });
    }
  }

  // Fetch bookmark responses from database and sets responses in ascending order by id, then descending by rank
  const fetchBookmarkResponses = async (userId: string, deckId: string) => {
    // Skip fetching for reserved decks
    if (selectedDeck.title && reservedDeckTitles.includes(selectedDeck.title)) {
      setBookmarkResponses({});
      return;
    }

    try {
      setBookmarkResponses({});
      setIsLoading(true);
      const res = await fetch(`/api/getBookmarkResponses?userId=${userId}&bookmarkId=${deckId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();      
      
      // Transform the response data
      const transformedResponses = data.map((response: BookmarkResponse) => ({
        id: response.id,
        content: response.content,
        rank: response.rank,
        isPaused: response.isPaused,
        decks: response.decks,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        furigana: response.furigana,
        isFuriganaEnabled: response.isFuriganaEnabled,
        isPhoneticEnabled: response.isPhoneticEnabled ?? true, // Default to true if not set
        isKanaEnabled: response.isKanaEnabled ?? true, // Default to true if not set
        breakdown: response.breakdown,
        mobileBreakdown: response.mobileBreakdown,
        source: response.source,
        communityResponseId: response.communityResponseId,
        communityResponse: response.communityResponse,
        isSharedToCommunity: response.isSharedToCommunity,
      }));

      // Sort responses using the new function
      const sortedResponses = sortResponses(transformedResponses);

      // Convert to dictionary
      const dict = Object.fromEntries((sortedResponses as Response[]).map((r: Response) => [r.id, r]));
      
      
      setBookmarkResponses(dict);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching bookmark responses:', error);
    }
  };

  const fetchAllResponses = async (userId: string) => {
    setBookmarkResponses({});
    setIsLoading(true);
    try {
      const res = await fetch(`/api/getUserResponses?userId=${userId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      scrollToTop();
      const data = await res.json();
      const dict = Object.fromEntries(data.map((response: Response) => [response.id, {
        id: response.id,
        content: response.content,
        rank: response.rank,
        isPaused: response.isPaused,
        decks: response.decks,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        furigana: response.furigana,
        isFuriganaEnabled: response.isFuriganaEnabled,
        isPhoneticEnabled: response.isPhoneticEnabled ?? true, // Default to true if not set
        isKanaEnabled: response.isKanaEnabled ?? true, // Default to true if not set
        breakdown: response.breakdown,
        mobileBreakdown: response.mobileBreakdown,
        source: response.source,
        communityResponseId: response.communityResponseId,
        communityResponse: response.communityResponse,
        isSharedToCommunity: response.isSharedToCommunity,
      }]));
      
      
      setBookmarkResponses(dict);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching all responses:', error);
    } finally {
      scrollToBottom();
    }
  }

  // Handle the user's input, does not save to database
  const handleSubmit = async (prompt: string, model?: string) => {
    try {
      setIsLoading(true);
      
      // If there's quoted material, include it with the user's question
      const processedPrompt = responseQuote 
        ? `${prompt}\n\nQuoted material:\n* ${responseQuote}` 
        : prompt;
      
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: processedPrompt,
          languageCode: selectedLanguage || 'ja',
          model: model || 'gpt-4o' // Default to gpt-4o if no model is specified
      }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: { result: string } = await res.json();
      // Generate a temporary id for client-side responses
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setResponses(prevResponses => ({
        ...prevResponses,
        [tempId]: {
          id: tempId,
          content: data.result,
          rank: 1,
          isPaused: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          isFuriganaEnabled: false,
          isPhoneticEnabled: true,
          isKanaEnabled: true
        }
      }));
      setResponseQuote(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setResponses(prevResponses => ({
        ...prevResponses,
        [tempId]: {
          id: tempId,
          content: 'An error occurred while fetching the response.',
          rank: 1,
          isPaused: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          isFuriganaEnabled: false,
          isPhoneticEnabled: true,
          isKanaEnabled: true
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Adjusts the user input offset when the user input changes
  const handleUserInputOffset = (offset: number) => {
    setUserInputOffset(offset);
  };

  // Deletes response from database and updates state locally
  const handleResponseDelete = async (responseId: string, decks?: Record<string, string>) => {
    if (!session?.userId) return;
    
    try {
      const res = await fetch(
        `/api/deleteGPTResponse`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gptResponseId: responseId,
            decks: decks || {}
          })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete response');
      }

      // Update bookmarkResponses (delete single item)
      setBookmarkResponses(prev => {
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });

      // Update search results cache
      setSearchResultsCache(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });

      // Update daily summary cache
      setDailySummaryCache(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        delete copy[responseId];
        return copy;
      });
      
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const handleResponseQuote = (response: string, type: 'submit' | 'breakdown' | 'input' = 'input') => {
    const submitResponse = `* Breakdown the following phrase:\n\n${response}`;

    if (type === 'breakdown') {
      handleSubmit(submitResponse, 'gpt-4o-mini');
      setResponseQuote(null); // Clear any existing quote when doing breakdown
    } else {
      setResponseQuote(response);
    }
  };

  const setResponseQuoteToNull = () => {
    setResponseQuote(null);
    setQuoteBarHeight(0); // Reset height when quote is cleared
  };

  // Handle QuoteBar height changes
  const handleQuoteBarHeightChange = (height: number) => {
    setQuoteBarHeight(height);
  };

  // Utility function to update a response across all cache states
  const updateResponseInCaches = (responseId: string, updates: Partial<Response | BookmarkResponse>) => {
    // Update responses state
    setResponses(prev => {
      const updated = { ...prev };
      if (updated[responseId]) {
        updated[responseId] = {
          ...updated[responseId],
          ...updates,
        };
      }
      return updated;
    });

    // Update bookmarkResponses state
    setBookmarkResponses(prev => {
      const updated = { ...prev };
      if (updated[responseId]) {
        updated[responseId] = {
          ...updated[responseId],
          ...updates,
        };
      }
      return updated;
    });

    // Update dailySummaryCache if it exists
    setDailySummaryCache(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (updated[responseId]) {
        updated[responseId] = {
          ...updated[responseId],
          ...updates,
        };
      }
      return updated;
    });

    // Update searchResultsCache if it exists
    setSearchResultsCache(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (updated[responseId]) {
        updated[responseId] = {
          ...updated[responseId],
          ...updates,
        };
      }
      return updated;
    });
  };

  const handleRankUpdate = async (responseId: string, newRank: number) => {
    if (!session?.userId) return;
    
    const oldRank = responses[responseId]?.rank || bookmarkResponses[responseId]?.rank;
    if (oldRank === undefined) return;

    // Create a unique key for this rank update operation
    const updateKey = `${responseId}-${oldRank}-${newRank}`;
    
    // Check if this exact update is already in progress
    if (ongoingRankUpdatesRef.current.has(updateKey)) {
      return;
    }

    // Mark this update as in progress
    ongoingRankUpdatesRef.current.add(updateKey);

    try {
      const response = await fetch('/api/updateGPTResponseRank', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gptResponseId: responseId,
          rank: newRank,
        }),
      });

      if (response.ok) {        
        // Update all caches with new rank
        updateResponseInCaches(responseId, { rank: newRank });

        // Track the change (moved outside of state setter to avoid duplicates)
        trackChangeRank(responseId, oldRank, newRank);
      }
    } catch (error) {
      console.error('Error updating rank:', error);
    } finally {
      // Remove the update from the ongoing set after a short delay
      setTimeout(() => {
        ongoingRankUpdatesRef.current.delete(updateKey);
      }, 1000);
    }
  };

  const handlePauseToggle = async (responseId: string, isPaused: boolean) => {    
    if (!session?.userId) return;

    try {
      const response = await fetch('/api/toggleResponsePause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.userId,
          responseId,
          isPaused,
        }),
      });

      if (response.ok) {
        // Update all caches with new pause state
        updateResponseInCaches(responseId, { isPaused });
        trackPauseToggle(isPaused);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleFuriganaToggle = async (responseId: string, isFuriganaEnabled: boolean) => {
    if (!session?.userId) return;

    // Skip API call for temp responses
    if (responseId.includes('temp')) {
      // Update local state only for temp responses
      updateResponseInCaches(responseId, { isFuriganaEnabled });
      return;
    }

    try {
      const response = await fetch('/api/updateFuriganaEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId,
          isFuriganaEnabled,
        }),
      });

      if (response.ok) {
        // Update all caches with new furigana state
        updateResponseInCaches(responseId, { isFuriganaEnabled });
      }
    } catch (error) {
      console.error('Error toggling furigana:', error);
    }
  };

  const handlePhoneticToggle = async (responseId: string, isPhoneticEnabled: boolean) => {
    if (!session?.userId) return;

    // Skip API call for temp responses
    if (responseId.includes('temp')) {
      // Update local state only for temp responses
      updateResponseInCaches(responseId, { isPhoneticEnabled });
      return;
    }

    try {
      const res = await fetch('/api/updatePhoneticEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseId, isPhoneticEnabled }),
      });

      if (!res.ok) {
        throw new Error('Failed to update phonetic enabled state');
      }

      // Update local state
      updateResponseInCaches(responseId, { isPhoneticEnabled });
    } catch (error) {
      console.error('Error toggling phonetic:', error);
    }
  };

  const handleKanaToggle = async (responseId: string, isKanaEnabled: boolean) => {
    try {
      const res = await fetch('/api/updateKanaEnabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseId, isKanaEnabled }),
      });

      if (!res.ok) {
        throw new Error('Failed to update kana enabled state');
      }

      // Update local state
      updateResponseInCaches(responseId, { isKanaEnabled });
    } catch (error) {
      console.error('Error toggling kana:', error);
    }
  };

  const handleGenerateSummary = async (forceRefresh: boolean = false) => {
    if (!session?.userId) return;
    
    try {
      setIsLoading(true);
      const res = await fetch(`/api/getDailySummary?userId=${session.userId}&forceRefresh=${forceRefresh}`);
      
      if (!res.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await res.json();
      
      if (data.success && data.responses) {
        // set state for summary timestamp
        if (data.createdAt) {
          setSummaryTimestamp(data.createdAt);      
        }
        
        const transformedResponses = data.responses.map((response: Response) => ({
          id: response.id,
          content: response.content,
          rank: response.rank,
          createdAt: new Date(response.createdAt),
          isPaused: response.isPaused,
          decks: response.decks,
          isFuriganaEnabled: response.isFuriganaEnabled,
          isPhoneticEnabled: response.isPhoneticEnabled,
          isKanaEnabled: response.isKanaEnabled,
          breakdown: response.breakdown,
          mobileBreakdown: response.mobileBreakdown,
          source: response.source,
          communityResponseId: response.communityResponseId,
          communityResponse: response.communityResponse,
          isSharedToCommunity: response.isSharedToCommunity,
        }));

        // Sort responses using the new function
        const sortedResponses = sortResponses(transformedResponses);

        // Cache the summary data as a dictionary
        const dict = Object.fromEntries(sortedResponses.map((r: Response) => [r.id, r]));
        setDailySummaryCache(dict);
        setBookmarkResponses(dict);
      } else {
        setBookmarkResponses({});
        setDailySummaryCache(null);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setBookmarkResponses({});
      setDailySummaryCache(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Compiles the instructions for the daily summary
  const compileDojoInstructions = (timestamp: Date | null) => {
    // modify timestamp format to be more readable (Month Day, Year, hour:minute)
    const formattedTimestamp = timestamp ? format(new Date(timestamp), 'h:mm a MMMM d, yyyy') : '';
    const compiledInstructions = {
      dailySummary: instructions.dailySummary,
      summaryTimestamp: timestamp ? `*Last generated at ${formattedTimestamp}*` : ''
    }

    // iterate over compiledInstructions and return all non-undefined values separated by '\n\n'
    return Object.values(compiledInstructions).filter(Boolean).join('\n\n');
  }

  // Community-specific handlers
  const handleCommunityImport = async (communityResponseId: string) => {
    try {
      const result = await importCommunityResponseAction(communityResponseId);
      if (result.success) {
        // Refresh community feed to update import counts with fresh data
        refetchCommunityFresh();
        
        // Show success message
        console.log('Successfully imported response:', result.message);
      } else {
        console.error('Failed to import response:', result.error);
        
        // If the error is about importing own response, show self-import modal
        if (result.error?.includes('your own shared response')) {
          setShowSelfImportModal(true);
        }
      }
    } catch (error) {
      console.error('Error importing community response:', error);
    }
  };

  // New modal-based import handler
  const handleCommunityImportWithModal = (communityResponse: any) => {
    setCommunityImportModal({
      isOpen: true,
      communityResponse
    });
  };


  // Handle import from DecksModal
  const handleCommunityImportFromModal = async (communityResponseId: string, bookmarkId?: string, createNew?: boolean) => {
    try {
      let result;
      
      // Check if this is a batch import (entire bookmark)
      if (communityResponseId === 'batch-import' && selectedCommunityDeckTitle) {
        // Handle batch import of entire bookmark
        if (bookmarkId && !createNew) {
          // Import to specific existing bookmark
          result = await importEntireCommunityBookmarkAction(selectedCommunityDeckTitle, bookmarkId);
        } else {
          // Create new bookmark or use auto-create approach
          result = await importEntireCommunityBookmarkAction(selectedCommunityDeckTitle);
        }
      } else {
        // Handle single response import
        if (bookmarkId && !createNew) {
          // Import to specific existing bookmark
          result = await importCommunityResponseToBookmarkAction(communityResponseId, bookmarkId);
        } else {
          // Create new bookmark or use auto-create approach
          result = await importCommunityResponseAction(communityResponseId);
        }
      }
      
      if (result.success) {
        // For single response imports, update the community response state
        if (communityResponseId !== 'batch-import') {
          updateCommunityResponse(communityResponseId, { 
            hasUserImported: true,
            importCount: (communityResponses.find(r => r.id === communityResponseId)?.importCount || 0) + 1
          });
        }
        
        // Don't refetch to preserve shuffle order and scroll position
        // The updateCommunityResponse above already updates the UI state
        console.log('Successfully imported response(s)');
        
        // If a new bookmark was created, notify the parent to refresh decks bar
        if (result.wasBookmarkCreated && result.bookmark && onDeckCreated) {
          onDeckCreated(result.bookmark);
        }
        
        // Refresh the decks sidebar to show updated timestamps
        if (onDecksRefresh) {
          onDecksRefresh();
        }
        
        // Show success confirmation instead of navigating away
        // This allows users to continue importing multiple responses
        setShowImportSuccessModal(true);
        if (result.bookmark) {
          setImportedBookmarkTitle(result.bookmark.title);
        }
        
        // Set imported count for batch imports
        if (communityResponseId === 'batch-import' && 'importedCount' in result && typeof result.importedCount === 'number') {
          setImportedCount(result.importedCount);
        } else {
          setImportedCount(null);
        }
        
        // For batch imports, also navigate to the bookmark
        if (communityResponseId === 'batch-import' && result.bookmark) {
          onDeckSelect(result.bookmark.id, result.bookmark.title);
        }
      } else {
        console.error('Failed to import response:', result.error);
        
        // Show specific error modals based on error type
        if (result.error?.includes('your own shared response')) {
          setShowSelfImportModal(true);
        } else {
          // Show generic import error modal for other failures
          setImportErrorMessage(result.error || 'Failed to import response');
          setShowImportErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Error importing community response:', error);
    }
  };

  const handleShareToCommunity = async (responseId: string) => {
    try {
      // First check if already shared
      const shareCheck = await checkResponseSharedAction(responseId);
      if (shareCheck.success && shareCheck.isShared) {
        // Get the bookmark title for the message
        const response = Object.values(responses).find(r => r.id === responseId) || 
                         Object.values(bookmarkResponses).find(r => r.id === responseId);
        const deckTitle = response?.decks ? Object.values(response.decks)[0] : 'Unknown';
        
        setSharedResponseTitle(deckTitle || 'your response');
        setShowAlreadySharedModal(true);
        return;
      }

      // Proceed with sharing
      const result = await shareResponseToCommunityAction(responseId);
      if (result.success) {
        console.log('Successfully shared to community:', result.message);
        
        // Immediately update local state to disable the share button
        updateResponseInCaches(responseId, { isSharedToCommunity: true });
        
        // Get the bookmark title for the success message
        const response = Object.values(responses).find(r => r.id === responseId) || 
                         Object.values(bookmarkResponses).find(r => r.id === responseId);
        const deckTitle = response?.decks ? Object.values(response.decks)[0] : 'Unknown';
        
        setSharedResponseTitle(deckTitle || 'your response');
        setShowShareSuccessModal(true);
        
        // Refresh community feed with fresh data
        refetchCommunityFresh();
      } else {
        console.error('Failed to share to community:', result.error);
        
        // If the error is about missing alias, store pending share info and show alias creation modal
        if (result.error?.includes('alias')) {
          // Get the response and deck title for pending share
          const response = Object.values(responses).find(r => r.id === responseId) || 
                           Object.values(bookmarkResponses).find(r => r.id === responseId);
          const deckTitle = response?.decks ? Object.values(response.decks)[0] : 'Unknown';
          
          setPendingShare({
            responseId,
            deckTitle: deckTitle || 'your response'
          });
          setIsCreateAliasModalOpen(true);
        } else if (result.error?.includes('already been shared')) {
          // Handle the case where server-side detects duplicate (backup)
          const response = Object.values(responses).find(r => r.id === responseId) || 
                           Object.values(bookmarkResponses).find(r => r.id === responseId);
          const deckTitle = response?.decks ? Object.values(response.decks)[0] : 'Unknown';
          
          setSharedResponseTitle(deckTitle || 'your response');
          setShowAlreadySharedModal(true);
        }
      }
    } catch (error) {
      console.error('Error sharing to community:', error);
    }
  };

  const handleAliasCreated = async (newAlias: string) => {
    setIsCreateAliasModalOpen(false);
    console.log('Alias created successfully:', newAlias);
    
    // Refresh MenuBar alias state so it shows 'Edit Alias' instead of 'Create Alias'
    await refreshUserAliasData();
    
    // If there's a pending share, attempt to share the response now
    if (pendingShare) {
      try {
        console.log('Attempting to share pending response:', pendingShare);
        const result = await shareResponseToCommunityAction(pendingShare.responseId);
        
        if (result.success) {
          console.log('Successfully shared pending response to community');
          
          // Update local state to disable the share button
          updateResponseInCaches(pendingShare.responseId, { isSharedToCommunity: true });
          
          // Show success modal with deck title
          setSharedResponseTitle(pendingShare.deckTitle);
          setShowShareAfterAliasSuccessModal(true);
          
          // Refresh community feed
          refetchCommunityFresh();
        } else {
          console.error('Failed to share pending response:', result.error);
          setSharedResponseTitle(pendingShare.deckTitle);
          setShowShareAfterAliasFailureModal(true);
        }
      } catch (error) {
        console.error('Error sharing pending response:', error);
        setSharedResponseTitle(pendingShare.deckTitle);
        setShowShareAfterAliasFailureModal(true);
      } finally {
        // Clear pending share regardless of outcome
        setPendingShare(null);
      }
    }
  };

  const handleViewProfile = (userId: string) => {
    // Navigate to user profile or show profile modal
    console.log('View profile for user:', userId);
    // TODO: Implement profile viewing functionality
  };

  const handleCommunityFiltersChange = (filters: CommunityFilters) => {
    updateCommunityFilters(filters);
  };

  const handleCommunityShuffle = () => {
    // Shuffle the community responses array randomly using the hook's function
    shuffleCommunityResponses();
  };

  const handleCommunityDelete = async (communityResponseId: string) => {
    try {
      const result = await deleteCommunityResponseAction(communityResponseId);
      if (result.success) {
        console.log('Successfully deleted community response:', result.message);
        
        // Refresh community feed to reflect the deletion
        // Our community feed uses client-side fetching via useCommunityFeed hook,
        // so we need this client-side refresh to update the UI
        refetchCommunityFresh();
      } else {
        console.error('Failed to delete community response:', result.error);
        // TODO: Show error modal to user
        throw new Error(result.error || 'Failed to delete community response');
      }
    } catch (error) {
      console.error('Error deleting community response:', error);
      // Re-throw so CommunityResponse component can handle the error
      throw error;
    }
  };

  const handleAliasClick = (alias: string) => {
    // Filter the community feed by the clicked alias
    updateCommunityFilters({ creatorAlias: alias });
  };

  const handleDeckClick = (deckTitle: string) => {
    // Filter the community feed by the clicked deck title
    updateCommunityFilters({ deckTitle: deckTitle });
  };


  const handleSearch = async (query: string) => {
    if (!session?.userId || !query.trim()) {
      setSearchResultsCache(null);
      // If we're in "all responses" view and search is cleared, reload all responses
      if (selectedDeck.id === "all" && session?.userId) {
        fetchAllResponses(session.userId);
      }
      return;
    }

    // Replace all spaces with ' & ' for to_tsquery compatibility
    const formattedQuery = query.trim().replace(/\s+/g, ' & ');

    try {
      setIsSearching(true);
      const res = await fetch(`/api/searchResponses?query=${encodeURIComponent(formattedQuery)}&languageCode=${selectedLanguage}`);
      if (!res.ok) {
        throw new Error('Failed to search responses');
      }
      const data = await res.json();
      const dict = Object.fromEntries(data.map((r: Response) => [r.id, r]));
      setSearchResultsCache(dict);
      
      // If we're in "all responses" view, update the bookmarkResponses directly
      if (selectedDeck.id === "all") {
        setBookmarkResponses(dict);
      } else {
        setBookmarkResponses(dict);
      }
    } catch (error) {
      console.error('Error searching responses:', error);
      setSearchResultsCache(null);
      setBookmarkResponses({});
    } finally {
      setIsSearching(false);
    }
  };

  // Filter responses that have expressions for flashcard mode
  const getFlashcardResponses = (): Response[] => {
    const responsesToFilter = Object.values(bookmarkResponses);
    return responsesToFilter.filter((response: Response) => {
      return extractExpressions(response.content).length > 0;
    });
  };

  // Handle flashcard mode
  const handleFlashcardMode = () => {
    const flashcards = getFlashcardResponses();
    setFlashcardResponses(flashcards);
    setIsFlashcardModalOpen(true);
  };

  const handleCreateNewContent = () => {
    onDeckSelect(null, null);
    router.push('/');
  };

  const handleImportEntireBookmark = () => {
    if (communityFilters?.deckTitle) {
      setSelectedCommunityDeckTitle(communityFilters.deckTitle);
      // Create a mock community response for the DecksModal
      const mockCommunityResponse = {
        id: 'batch-import', // Special ID to indicate batch import
        deckTitle: communityFilters.deckTitle,
        content: `Batch import from "${communityFilters.deckTitle}" deck`
      };
      setCommunityImportModal({
        isOpen: true,
        communityResponse: mockCommunityResponse
      });
    }
  };

  // Handle dojo navigation from ChatBoxMenuBar - fetch deck ID first
  const handleDojoNavigation = async () => {
    if (!session?.userId) return;
    
    try {
      // Fetch decks to find the daily summary deck ID
      const response = await fetch(`/api/getBookmarks?userId=${session.userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch decks');
      }
      const decks = await response.json();
      
      // Find the daily summary deck
      const dailySummaryDeck = decks.find((deck: any) => deck.title === 'daily summary');
      if (dailySummaryDeck) {
        // Use the proper deck ID and title
        onDeckSelect(dailySummaryDeck.id, dailySummaryDeck.title);
      } else {
        console.error('Daily summary deck not found');
      }
    } catch (error) {
      console.error('Error fetching decks for dojo navigation:', error);
    }
  };


  if (status === "loading") {
    return <div>Loading...</div>
  }
  

  return (
    <div className="bg-background h-full flex flex-col w-full">
      {/* ChatBox Menu Bar - Show for all cases */}
      <ChatBoxMenuBar
        onNewReport={handleGenerateSummary.bind(null, true)}
        onFlashcardMode={handleFlashcardMode}
        flashcardCount={getFlashcardResponses().length}
        selectedLanguage={selectedLanguage}
        summaryTimestamp={summaryTimestamp}
        selectedDeck={selectedDeck}
        isFlashcardModalOpen={isFlashcardModalOpen}
        onCreateNewContent={handleCreateNewContent}
        communityFilters={communityFilters}
        onImportEntireBookmark={handleImportEntireBookmark}
        onDeckSelect={onDeckSelect}
        onDojoNavigation={handleDojoNavigation}
        isDecksCollapsed={isDecksCollapsed}
      />
      
      {/* Community Filter Bar - positioned after menu bar */}
      {isCommunityMode && (
        <FilterBar
          onFiltersChange={handleCommunityFiltersChange}
          onShuffle={handleCommunityShuffle}
          isLoading={communityLoading}
          initialFilters={communityFilters} // Pass current filters to sync state
        />
      )}
      
      <div className="flex flex-col justify-between flex-1 h-0">
        {/* Chat Content Container */}
        <div 
          ref={chatContainerRef}
          className="overflow-y-auto flex-1 min-h-0"
          style={{ 
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-background/50 z-[90]">
            <div className="animate-spin h-8 w-8 border-4 border-foreground border-t-transparent rounded-full"></div>
          </div>
        )}
        
        
        {!selectedDeck.id && !isCommunityMode && (
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-2xl">
              <GPTResponse
                type="instruction"
                response={instructions.main}
                selectedDeckId={selectedDeck.id}
                selectedDeckTitle={selectedDeck.title ?? ''}
                reservedDeckTitles={reservedDeckTitles}
                responseId={null}
                onDeckSelect={onDeckSelect}
                selectedLanguage={selectedLanguage}
                onLoadingChange={setIsLoading}
              />
            </div>
          </div>
        )}
        
        {selectedDeck.title === 'daily summary' && (
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-2xl">
              <GPTResponse
                type="instruction"
                response={compileDojoInstructions(summaryTimestamp)}
                selectedDeckId={selectedDeck.id}
                selectedDeckTitle="daily summary"
                reservedDeckTitles={reservedDeckTitles}
                onRankUpdate={handleRankUpdate}
                onDelete={handleResponseDelete}
                onPauseToggle={handlePauseToggle}
                onFuriganaToggle={handleFuriganaToggle}
                onDeckSelect={onDeckSelect}
                selectedLanguage={selectedLanguage}
                onLoadingChange={setIsLoading}
              />
            </div>
          </div>
        )}

        {/* Community Mode */}
        {selectedDeck.title === 'community' && (
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-2xl">

              {/* Community Responses */}
              {communityError ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                  <p>Error loading community feed: {communityError}</p>
                  <button 
                    onClick={refetchCommunity}
                    className="mt-2 px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/80"
                  >
                    Retry
                  </button>
                </div>
              ) : communityLoading ? (
                <div className="fixed inset-0 flex items-center justify-center bg-background/50 z-[90]">
                  <div className="animate-spin h-8 w-8 border-4 border-foreground border-t-transparent rounded-full"></div>
                </div>
              ) : communityResponses.length > 0 ? (
                <>
                  {/* Generate alias color mapping for unique aliases in current page */}
                  {(() => {
                    const uniqueAliases = [...new Set(communityResponses.map(r => r.creatorAlias).filter(Boolean))];
                    const aliasColorMap = createAliasColorMap(uniqueAliases);
                    
                    return communityResponses.map((communityResponse) => (
                    <CommunityResponse
                      key={communityResponse.id}
                      type="community"
                      data={{
                        id: communityResponse.id,
                        content: communityResponse.content,
                        createdAt: communityResponse.createdAt,
                        updatedAt: communityResponse.updatedAt,
                        languageId: communityResponse.languageId,
                        breakdown: communityResponse.breakdown,
                        mobileBreakdown: communityResponse.mobileBreakdown,
                        furigana: communityResponse.furigana,
                        audio: communityResponse.audio,
                        audioMimeType: communityResponse.audioMimeType,
                        originalResponseId: communityResponse.originalResponseId,
                        creatorAlias: communityResponse.creatorAlias,
                        creatorUserId: communityResponse.creatorUserId,
                        deckTitle: communityResponse.bookmarkTitle,
                        isActive: communityResponse.isActive,
                        importCount: communityResponse.importCount,
                        sharedAt: communityResponse.sharedAt,
                        hasUserImported: communityResponse.hasUserImported
                      } as CommunityResponseData}
                      selectedDeckTitle="community"
                      selectedLanguage={selectedLanguage}
                      currentUserId={(session as any)?.userId || (session?.user as any)?.id}
                      onImportWithModal={handleCommunityImportWithModal}
                      onDelete={handleCommunityDelete}
                      onViewProfile={handleViewProfile}
                      onAliasClick={handleAliasClick}
                      onDeckClick={handleDeckClick}
                      onDeckSelect={onDeckSelect}
                      onQuote={handleResponseQuote}
                      onLoadingChange={setIsLoading}
                      aliasColor={aliasColorMap.get(communityResponse.creatorAlias)}
                      onDecksRefresh={onDecksRefresh}
                    />
                    ));
                  })()}
                  
                  {/* Load More Button */}
                  {communityHasMore && (
                    <div className="flex justify-center my-4">
                      <button
                        onClick={loadMoreCommunity}
                        disabled={communityLoading}
                        className="px-4 py-2 bg-muted text-muted-foreground rounded-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-muted disabled:hover:text-muted-foreground transition-colors duration-200 text-sm"
                      >
                        {communityLoading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </>
              ) : !communityLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No community responses found.</p>
                  <p className="text-sm mt-2">Be the first to share a response with the community</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {selectedDeck.id && !isCommunityMode ? (
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-2xl">
              {/* Search bar for all responses */}
              {selectedDeck.id === "all" && (
                <div className="mb-4">
                  <SearchBar
                    onSearch={handleSearch}
                    selectedLanguage={selectedLanguage}
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </div>
              )}
              
              {/* Loading indicator for search */}
              {selectedDeck.id === "all" && isSearching && (
                <div className="fixed inset-0 flex items-center justify-center bg-background/50 z-[90]">
                  <div className="animate-spin h-8 w-8 border-4 border-foreground border-t-transparent rounded-full"></div>
                </div>
              )}
              
              {/* Generate alias color mapping for imported responses */}
              {(() => {
                const importedResponses = Object.values(bookmarkResponses).filter(r => r.source === 'imported' && r.communityResponse?.creatorAlias);
                const uniqueAliases = [...new Set(importedResponses.map(r => r.communityResponse!.creatorAlias).filter(Boolean))];
                const aliasColorMap = createAliasColorMap(uniqueAliases);
                
                return Object.values(bookmarkResponses).map((response: Response, index: number) => (
                  <GPTResponse
                    key={response.id || index}
                    response={response.content}
                    selectedDeckId={selectedDeck.id}
                    selectedDeckTitle={selectedDeck.title ?? ''}
                    reservedDeckTitles={reservedDeckTitles}
                    responseId={response.id}
                    rank={response.rank}
                    createdAt={response.createdAt}
                    isPaused={response.isPaused}
                    decks={response.decks}
                    furigana={response.furigana}
                    isFuriganaEnabled={response.isFuriganaEnabled}
                    isPhoneticEnabled={response.isPhoneticEnabled}
                    isKanaEnabled={response.isKanaEnabled}
                    breakdown={response.breakdown}
                    mobileBreakdown={response.mobileBreakdown}
                    onQuote={handleResponseQuote}
                    onRankUpdate={handleRankUpdate}
                    onDelete={handleResponseDelete}
                    onPauseToggle={handlePauseToggle}
                    onFuriganaToggle={handleFuriganaToggle}
                    onPhoneticToggle={handlePhoneticToggle}
                    onKanaToggle={handleKanaToggle}
                    onDeckSelect={onDeckSelect}
                    onShare={handleShareToCommunity}
                    source={response.source}
                    communityResponseId={response.communityResponseId}
                    communityResponse={response.communityResponse}
                    aliasColor={response.communityResponse?.creatorAlias ? aliasColorMap.get(response.communityResponse.creatorAlias) : undefined}
                    isSharedToCommunity={response.isSharedToCommunity}
                    selectedLanguage={selectedLanguage}
                    onLoadingChange={setIsLoading}
                    onBreakdownClick={() => trackBreakdownClick(response.id!)}
                    onDecksRefresh={onDecksRefresh}
                  />
                ));
              })()}
            </div>
          </div>
        ) :
        !isCommunityMode ? (
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-2xl">
              {/* Generate alias color mapping for imported responses */}
              {(() => {
                const importedResponses = Object.values(responses).filter(r => r.source === 'imported' && r.communityResponse?.creatorAlias);
                const uniqueAliases = [...new Set(importedResponses.map(r => r.communityResponse!.creatorAlias).filter(Boolean))];
                const aliasColorMap = createAliasColorMap(uniqueAliases);
                
                return Object.values(responses).map((response, index) => (
                  <GPTResponse
                    key={response.id || index}
                    response={response.content}
                    selectedDeckId={selectedDeck.id}
                    selectedDeckTitle={selectedDeck.title ?? ''}
                    reservedDeckTitles={reservedDeckTitles}
                    responseId={response.id}
                    isPaused={response.isPaused}
                    isFuriganaEnabled={response.isFuriganaEnabled}
                    isPhoneticEnabled={response.isPhoneticEnabled}
                    isKanaEnabled={response.isKanaEnabled}
                    onDelete={handleResponseDelete}
                    onQuote={handleResponseQuote}
                    onRankUpdate={handleRankUpdate}
                    onFuriganaToggle={handleFuriganaToggle}
                    onPhoneticToggle={handlePhoneticToggle}
                    onKanaToggle={handleKanaToggle}
                    onDeckSelect={onDeckSelect}
                    source={response.source}
                    communityResponseId={response.communityResponseId}
                    communityResponse={response.communityResponse}
                    aliasColor={response.communityResponse?.creatorAlias ? aliasColorMap.get(response.communityResponse.creatorAlias) : undefined}
                    isSharedToCommunity={response.isSharedToCommunity}
                    selectedLanguage={selectedLanguage}
                    onLoadingChange={setIsLoading}
                    onDeckCreated={onDeckCreated}
                    onDecksRefresh={onDecksRefresh}
                  />
                ));
              })()}
            </div>
          </div>
        ) : null}
        </div>
        
        {/* Bottom section: QuoteBar + Input (UserInput only, FilterBar moved to top) */}
        {!selectedDeck.id && !isCommunityMode && (
          <div className="flex-shrink-0">
            {/* Show QuoteBar if we have responseQuote (only in chat mode) */}
            {responseQuote && (
              <div className="bg-background">
                <QuoteBar 
                  quotedText={responseQuote}
                  onClear={setResponseQuoteToNull}
                  onHeightChange={handleQuoteBarHeightChange}
                />
              </div>
            )}
            
            {/* Input at the very bottom - UserInput only */}
            <div 
              className="bg-background" 
              style={{ 
                paddingBottom: 'env(safe-area-inset-bottom)' 
              }}
            >
              <UserInput 
                onSubmit={handleSubmit} 
                isLoading={isLoading} 
                defaultPrompt={null}
                onUserInputOffset={handleUserInputOffset}
                onQuoteToNull={setResponseQuoteToNull}
                selectedLanguage={selectedLanguage}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Flashcard Modal */}
      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => setIsFlashcardModalOpen(false)}
        responses={flashcardResponses}
        selectedLanguage={selectedLanguage}
        onRankUpdate={handleRankUpdate}
        onPauseToggle={handlePauseToggle}
        onFuriganaToggle={handleFuriganaToggle}
        onPhoneticToggle={handlePhoneticToggle}
        onKanaToggle={handleKanaToggle}
        onLoadingChange={setIsLoading}
      />

      {/* Alias Creation Modal */}
      <CreateAliasModal
        isOpen={isCreateAliasModalOpen}
        onClose={() => {
          setIsCreateAliasModalOpen(false);
          // Clear pending share if user cancels alias creation
          setPendingShare(null);
        }}
        onAliasCreated={handleAliasCreated}
      />

      {/* Share Success Modal */}
      {showShareSuccessModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Shared to Community</h2>
              <button 
                onClick={() => setShowShareSuccessModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              The response has successfully been shared to the community feed. Other people can now discover and import it.
            </p>
          </div>
        </div>
      )}

      {/* Share Success After Alias Creation Modal */}
      {showShareAfterAliasSuccessModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Alias Created & Response Shared</h2>
              <button 
                onClick={() => setShowShareAfterAliasSuccessModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              Your alias has been successfully created and your response from <span className="font-medium">{sharedResponseTitle}</span> has been shared to the community feed. Other people can now discover and import it.
            </p>
          </div>
        </div>
      )}

      {/* Share Failure After Alias Creation Modal */}
      {showShareAfterAliasFailureModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Alias Created Successfully</h2>
              <button 
                onClick={() => setShowShareAfterAliasFailureModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              Your alias has been created successfully, however, we encountered an issue sharing your response from <span className="font-medium">{sharedResponseTitle}</span> to the community. Please try clicking the share button again.
            </p>
          </div>
        </div>
      )}

      {/* Already Shared Modal */}
      {showAlreadySharedModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Already Shared</h2>
              <button 
                onClick={() => setShowAlreadySharedModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              This response from "{sharedResponseTitle}" has already been shared to the community feed.
            </p>
          </div>
        </div>
      )}

      {/* Self Import Prevention Modal */}
      {showSelfImportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Can't Import Own Response</h2>
              <button 
                onClick={() => setShowSelfImportModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              You cannot import your own shared responses. This response is already available in your personal decks.
            </p>
          </div>
        </div>
      )}

      {/* Import Success Modal */}
      {showImportSuccessModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-card-foreground">Successfully Imported</h2>
              <button 
                onClick={() => setShowImportSuccessModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              {importedCount !== null ? (
                `Successfully imported ${importedCount} response${importedCount !== 1 ? 's' : ''} to '${importedBookmarkTitle}'. You can continue browsing the community feed or visit your bookmark to see the imported content.`
              ) : (
                `The response has been successfully imported to '${importedBookmarkTitle}'. You can continue browsing the community feed or visit your bookmark to see the imported content.`
              )}
            </p>
          </div>
        </div>
      )}

      {/* Import Error Modal */}
      {showImportErrorModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
          <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-l text-destructive">Import Failed</h2>
              <button 
                onClick={() => setShowImportErrorModal(false)} 
                className="text-card-foreground hover:text-muted-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-card-foreground">
              {importErrorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Community Import DecksModal */}
      <DecksModal
        isOpen={communityImportModal.isOpen}
        onClose={() => setCommunityImportModal({ isOpen: false, communityResponse: null })}
        response={communityImportModal.communityResponse?.content || ''}
        reservedDeckTitles={reservedDeckTitles}
        communityResponse={communityImportModal.communityResponse ? {
          id: communityImportModal.communityResponse.id,
          deckTitle: communityImportModal.communityResponse.deckTitle,
          content: communityImportModal.communityResponse.content,
          breakdown: communityImportModal.communityResponse.breakdown,
          mobileBreakdown: communityImportModal.communityResponse.mobileBreakdown,
          furigana: communityImportModal.communityResponse.furigana,
          audio: communityImportModal.communityResponse.audio,
          audioMimeType: communityImportModal.communityResponse.audioMimeType
        } : undefined}
        onCommunityImport={handleCommunityImportFromModal}
        onDeckCreated={onDeckCreated}
        onDecksRefresh={onDecksRefresh}
      />
    </div>
  );
}
