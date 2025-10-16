'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  XCircleIcon, 
  ChevronDownIcon, 
  ArrowPathIcon, 
  PauseCircleIcon,
  PlayCircleIcon,
  XMarkIcon,
  CheckIcon,
  TableCellsIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import DecksModal from './DecksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import EnhancedDeleteModal from './EnhancedDeleteModal';
import BreakdownModal from './BreakdownModal';
import ErrorModal from './ErrorModal';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';
import IconButton from './ui/IconButton';
import { StyledMarkdown, DeleteIcon, AliasBadge, ExpandableContent, DeckNavigationModal } from './ui';
import Tooltip from './Tooltip';
import { trackBreakdownClick, trackPauseToggle, trackChangeRank, trackAddToDeck } from '@/lib/analytics';
import { checkGPTResponseDeletionImpactAction, deleteGPTResponseWithCascadeAction } from '../../actions/community';
import { extractExpressions, prepareTextForSpeech } from '@/lib/utils';
import { useTheme } from '../contexts/ThemeContext';

import { useIsMobile } from '../hooks/useIsMobile';
import StandardResponse from './StandardResponse';

interface GPTResponseProps {
  response: string;
  selectedDeckId: string | null;
  selectedDeckTitle: string | null;
  reservedDeckTitles: string[];
  responseId?: string | null;
  rank?: number;
  createdAt?: Date;
  type?: 'instruction' | 'response' | 'other';
  isPaused?: boolean;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  audio?: string | null;
  audioMimeType?: string | null;
  hideContent?: boolean;
  showAnswer?: boolean;
  onToggleAnswer?: () => void;
  onDelete?: (responseId: string, decks: Record<string, string>) => Promise<void>;
  onQuote?: (response: string, type: 'submit' | 'breakdown' | 'input') => void;
  onDeckCreated?: (newDeck: { id: string, title: string }) => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onFuriganaToggle?: (responseId: string, isFuriganaEnabled: boolean) => Promise<void>;
  onPhoneticToggle?: (responseId: string, isPhoneticEnabled: boolean) => Promise<void>;
  onKanaToggle?: (responseId: string, isKanaEnabled: boolean) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  onDeckSelect?: (id: string | null, title: string | null) => void;
  onShare?: (responseId: string) => Promise<void>;
  source?: 'local' | 'imported';
  communityResponseId?: string | null;
  communityResponse?: {
    id: string;
    isActive: boolean;
    creatorAlias: string;
  } | null;
  aliasColor?: string;
  isSharedToCommunity?: boolean;
  decks?: Record<string, string>;
  selectedLanguage?: string;
  onLoadingChange?: (isLoading: boolean) => void;
  onBreakdownClick?: () => void;
  onBreakdownToggle?: React.MutableRefObject<(() => void) | null>;
  containerWidth?: number;
  onDecksRefresh?: () => void;
}

export default function GPTResponse({ 
  response, 
  selectedDeckId, 
  selectedDeckTitle,
  reservedDeckTitles,
  responseId, 
  rank = 1, 
  createdAt,
  type = 'response',
  isPaused = false,
  furigana,
  isFuriganaEnabled = false,
  isPhoneticEnabled = false,
  isKanaEnabled,
  breakdown,
  mobileBreakdown,
  audio,
  audioMimeType,
  hideContent = false,
  showAnswer,
  onToggleAnswer,
  onDelete, 
  onQuote,
  onRankUpdate,
  onPauseToggle,
  onFuriganaToggle,
  onPhoneticToggle,
  onKanaToggle,
  onGenerateSummary,
  onDeckSelect,
  onShare,
  source,
  communityResponseId,
  communityResponse,
  aliasColor,
  isSharedToCommunity,
  decks,
  selectedLanguage = 'ja',
  onLoadingChange,
  onBreakdownClick,
  onBreakdownToggle,
  onDeckCreated,
  containerWidth,
  onDecksRefresh
}: GPTResponseProps) {
  const red = '#d93900'
  const yellow = '#b59f3b'
  const brightYellow = '#ecc94b'
  const green = '#2ea149'
  const blue = '#3b82f6'
  const lightBlue = '#63b3ed'
  const white = '#fff'
  const [newRank, setNewRank] = useState(rank);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<{
    isSharedResponse: boolean;
    importCount: number;
    importerCount: number;
  } | null>(null);
  const [showEnhancedDeleteModal, setShowEnhancedDeleteModal] = useState(false);
  const [showDeckNavigationModal, setShowDeckNavigationModal] = useState(false);
  const [addedDeckInfo, setAddedDeckInfo] = useState<{ id: string; title: string } | null>(null);
  
  // Determine if share button should be disabled
  const isShareDisabled = source === 'imported' || isSharedToCommunity || isSharing;

  const router = useRouter();
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isDeckHovered, setIsDeckHovered] = useState(false);
  const quoteButtonRef = React.useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const deckButtonRef = React.useRef<HTMLButtonElement>(null);
  const refreshButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [desktopBreakdownContent, setDesktopBreakdownContent] = useState(breakdown || '');
  const [mobileBreakdownContent, setMobileBreakdownContent] = useState(mobileBreakdown || '');
  const [currentBreakdownContent, setCurrentBreakdownContent] = useState('');
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [isBreakdownTextView, setIsBreakdownTextView] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Audio cache state - initialize from props (like breakdown)
  const [cachedAudioData, setCachedAudioData] = useState<{ audio: string; mimeType: string } | null>(
    audio && audioMimeType ? { audio, mimeType: audioMimeType } : null
  );

  const { isMobile, mobileOffset } = useIsMobile();
  
  // Furigana toggle state - initialize from props
  const [localFuriganaEnabled, setLocalFuriganaEnabled] = useState(isFuriganaEnabled);
  const [showFuriganaDropdown, setShowFuriganaDropdown] = useState(false);
  const furiganaDropdownRef = useRef<HTMLDivElement>(null);
  
  // Phonetic toggle state - initialize from props
  const [localPhoneticEnabled, setLocalPhoneticEnabled] = useState(isPhoneticEnabled);
  
  // Kana toggle state - initialize from props
  const [localKanaEnabled, setLocalKanaEnabled] = useState(isKanaEnabled);
  
  // Track current furigana (starts with cached furigana, gets updated when new furigana is generated)
  const [currentFurigana, setCurrentFurigana] = useState<string | null>(furigana || null);

  const { theme } = useTheme();

  // Sync local furigana state with prop changes
  useEffect(() => {
    setLocalFuriganaEnabled(isFuriganaEnabled);
  }, [isFuriganaEnabled]);

  // Sync local phonetic state with prop changes
  useEffect(() => {
    setLocalPhoneticEnabled(isPhoneticEnabled);
  }, [isPhoneticEnabled]);

  // Sync local kana state with prop changes
  useEffect(() => {
    setLocalKanaEnabled(isKanaEnabled);
  }, [isKanaEnabled]);

  // Sync breakdown content with prop changes
  useEffect(() => {
    if (breakdown) {
      setDesktopBreakdownContent(breakdown);
    }
  }, [breakdown]);

  // Sync mobile breakdown content with prop changes
  useEffect(() => {
    if (mobileBreakdown) {
      setMobileBreakdownContent(mobileBreakdown);
    }
  }, [mobileBreakdown]);

  // Handle furigana updates from StandardResponse
  const handleFuriganaGenerated = (newFurigana: string) => {
    setCurrentFurigana(newFurigana);
  };

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (furiganaDropdownRef.current && !furiganaDropdownRef.current.contains(event.target as Node)) {
        setShowFuriganaDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle furigana toggle
  const handleFuriganaToggle = async () => {
    const newState = !localFuriganaEnabled;
    setLocalFuriganaEnabled(newState);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    if (selectedLanguage !== 'ja') {
      setShowFuriganaDropdown(false);
    }

    // Use parent's handler if available and we have a responseId
    if (responseId && onFuriganaToggle) {
      try {
        await onFuriganaToggle(responseId, newState);
      } catch (error) {
        console.error('Error updating furigana enabled state:', error);
        // Revert the state if the API call fails
        setLocalFuriganaEnabled(!newState);
      }
    }
  };

  // Handle phonetic toggle
  const handlePhoneticToggle = async () => {
    const newState = !localPhoneticEnabled;
    setLocalPhoneticEnabled(newState);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    if (selectedLanguage !== 'ja') {
      setShowFuriganaDropdown(false);
    }

    // Use parent's handler if available and we have a responseId
    if (responseId && onPhoneticToggle) {
      try {
        await onPhoneticToggle(responseId, newState);
      } catch (error) {
        console.error('Error updating phonetic enabled state:', error);
        // Revert the state if the API call fails
        setLocalPhoneticEnabled(!newState);
      }
    }
  };

  // Handle kana toggle
  const handleKanaToggle = async () => {
    const newState = !localKanaEnabled;
    setLocalKanaEnabled(newState);
    // Only close dropdown for non-Japanese languages (Japanese has multiple options)
    if (selectedLanguage !== 'ja') {
      setShowFuriganaDropdown(false);
    }

    // Use parent's handler if available and we have a responseId
    if (responseId && onKanaToggle) {
      try {
        await onKanaToggle(responseId, newState);
      } catch (error) {
        console.error('Error updating kana enabled state:', error);
        // Revert the state if the API call fails
        setLocalKanaEnabled(!newState);
      }
    }
  };

  // Helper to check if a block should use StandardResponse styling
  const isStandardResponse = (items: string[]) => [2, 3, 4].includes(items.filter(item => item.match(/^\s*\d+\/\s*/)).length);

  // Extract expressions using utility function
  // This is used for voice and breakdown logic

  const expressions = extractExpressions(response);
  
  const hasExpression = expressions.length > 0;
  
  const cleanResponse = response
    .replace(/^\s*<>\s*/gm, '• ')
    .replace(/^\s*-\s*/gm, '• ')
    .replace(/ {2,}$/gm, '');

  // Prepare custom list items for numbered lists, restarting numbering for each block
  const blocks = response
    .split(/\r?\n\s*\r?\n/)
    .map(block => block.trim())
    .filter(Boolean);

  // Extract numbered lines from each block
  const parsedBlocks = blocks.map((block, blockIdx) => {
    const lines = block.split(/\r?\n/);
    const numberedLines = lines
      .map(line => {
        const match = line.match(/^\s*\d+\/\s*(.*)$/);
        // Return the full line if it matches the pattern, null otherwise
        return match ? line.trim() : null;
      })
      .filter((item): item is string => !!item);

    // If we have numbered lines, include any non-numbered lines that come before them
    if (numberedLines.length >= 2) {
      const firstNumberedIndex = lines.findIndex(line => line.match(/^\s*\d+\/\s*(.*)$/));
      const nonNumberedPrefix = lines.slice(0, firstNumberedIndex).filter(line => line.trim());
      
      // Return both the non-numbered prefix and the numbered lines
      if (nonNumberedPrefix.length > 0) {
        return [...nonNumberedPrefix, ...numberedLines];
      }
      return numberedLines;
    }
    
    // Otherwise, return the original block text
    return [block];
  });




  const onRankClick = async (increment: boolean) => {
    const calculatedNewRank = increment ? rank + 1 : rank - 1;
    await handleRankClick(increment);
    setNewRank(calculatedNewRank);
  };
  
  const handleRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankUpdate(responseId, newRank);
      await trackChangeRank(responseId, rank, newRank);
    }
  };

  const handleDeleteClick = async () => {
    if (!responseId) return;

    try {
      // Check deletion impact first
      const impact = await checkGPTResponseDeletionImpactAction(responseId);
      
      console.log('Deletion impact check result:', impact);
      
      if (impact.success && 'canDelete' in impact && impact.canDelete) {
        setDeletionImpact({
          isSharedResponse: impact.isSharedResponse,
          importCount: impact.importCount,
          importerCount: impact.importerCount
        });

        console.log('Deletion impact:', {
          isSharedResponse: impact.isSharedResponse,
          importCount: impact.importCount,
          importerCount: impact.importerCount
        });

        if (impact.isSharedResponse && impact.importCount > 0) {
          // Show enhanced deletion modal for shared responses with imports
          console.log('Showing enhanced deletion modal');
          setShowEnhancedDeleteModal(true);
        } else {
          // Show regular deletion modal for non-shared responses or shared responses with no imports
          console.log('Showing regular deletion modal');
          setIsDeleteModalOpen(true);
        }
      } else {
        console.error('Cannot delete response:', 'error' in impact ? impact.error : 'Unknown error');
        console.log('Falling back to regular deletion modal due to impact check failure');
        setIsDeleteModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking deletion impact:', error);
      // Fallback to regular deletion modal
      console.log('Falling back to regular deletion modal due to error');
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!responseId || isDeleting) return;

    try {
      setIsDeleting(true);
      
      if (deletionImpact?.isSharedResponse) {
        // Use enhanced deletion for shared responses
        const result = await deleteGPTResponseWithCascadeAction(responseId, decks || {});
        
        if (result.success) {
          setIsDeleteModalOpen(false);
          setShowEnhancedDeleteModal(false);
          // Trigger any parent refresh logic if needed
          // The parent's onDelete callback might be used for UI updates
          if (onDelete) {
            await onDelete(responseId, decks || {});
          }
        } else {
          console.error('Error deleting shared response:', result.error);
          // TODO: Show error modal
        }
      } else {
        // Use regular deletion for non-shared responses
        if (onDelete) {
          await onDelete(responseId, decks || {});
        }
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting response:', error);
      // TODO: Show error modal
    } finally {
      setIsDeleting(false);
      setDeletionImpact(null);
    }
  };

  const handleDeckClick = () => {
    if (decks && Object.keys(decks).length > 0) {
      // Find the first non-reserved deck by checking each ID and title pair
      const nonReservedDeckEntry = Object.entries(decks).find(([id, title]) => 
        !reservedDeckTitles?.includes(title)
      );
      
      if (nonReservedDeckEntry) {
        const [deckId, deckTitle] = nonReservedDeckEntry;
        // Update URL
        router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
        // Call the parent's callback to update state
        onDeckSelect?.(deckId, deckTitle);
      } else {
        // If no non-reserved deck is found, use the first deck
        const [deckId, deckTitle] = Object.entries(decks)[0];
        router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
        onDeckSelect?.(deckId, deckTitle);
      }
    }
  };

  const handleBreakdownClick = async () => {
    try {
      // Check current screen size at the time of click
      const currentIsMobile = window.innerWidth < 640 || /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
      
      // Set initial view state
      setIsBreakdownTextView(currentIsMobile);
      
      // Check if we already have the appropriate breakdown cached
      const cachedBreakdown = currentIsMobile ? mobileBreakdownContent : desktopBreakdownContent;
      
      if (cachedBreakdown) {
        setCurrentBreakdownContent(cachedBreakdown);
        setIsBreakdownModalOpen(true);
        if (responseId) await trackBreakdownClick(responseId);
        return;
      }

      // Generate the breakdown we need - show external loading for initial click
      await generateBreakdown(currentIsMobile, true);
      setIsBreakdownModalOpen(true);
      if (responseId) await trackBreakdownClick(responseId);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate breakdown');
      setIsErrorModalOpen(true);
    }
  };

  // Create a modal toggle function for external components
  const handleBreakdownModalToggle = useCallback(() => {
    if (isBreakdownModalOpen) {
      // If modal is open, close it
      setIsBreakdownModalOpen(false);
    } else {
      // If modal is closed, open it
      handleBreakdownClick();
    }
  }, [isBreakdownModalOpen, handleBreakdownClick]);

  // Expose the toggle function to parent component
  useEffect(() => {
    if (onBreakdownToggle) {
      onBreakdownToggle.current = handleBreakdownModalToggle;
    }
  }, [onBreakdownToggle, handleBreakdownModalToggle]);

  const generateBreakdown = async (isMobile: boolean, showExternalLoading: boolean = true) => {
    setIsBreakdownLoading(true);
    if (showExternalLoading) {
      onLoadingChange?.(true);
    }
    
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: response,
          language: selectedLanguage,
          responseId: responseId,
          isMobile: isMobile
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate breakdown');
      }

      const data = await res.json();
      
      // Cache both breakdowns if available from the API response
      if (data.desktopBreakdown) {
        setDesktopBreakdownContent(data.desktopBreakdown);
      }
      if (data.mobileBreakdown) {
        setMobileBreakdownContent(data.mobileBreakdown);
      }
      
      // Set the current breakdown content for display
      setCurrentBreakdownContent(data.breakdown);
    } finally {
      setIsBreakdownLoading(false);
      if (showExternalLoading) {
        onLoadingChange?.(false);
      }
    }
  };

  const handleBreakdownFormatToggle = async (toTextView: boolean, showExternalLoading: boolean = false) => {
    setIsBreakdownTextView(toTextView);
    
    // Check if we have the content for the requested view
    const neededContent = toTextView ? mobileBreakdownContent : desktopBreakdownContent;
    
    if (neededContent) {
      // We have the content, switch immediately
      setCurrentBreakdownContent(neededContent);
    } else {
      // We need to generate the content
      await generateBreakdown(toTextView, showExternalLoading);
    }
  };



  const handlePauseToggle = async (responseId: string, newIsPaused: boolean) => {
    if (!onPauseToggle) return;
    await onPauseToggle(responseId, newIsPaused);
    await trackPauseToggle(newIsPaused);
  };

  const handleShareToCommunity = async () => {
    console.log('Share button clicked!', { onShare: !!onShare, responseId });
    
    if (!onShare || !responseId) {
      console.log('Share cancelled - missing handler or responseId', { onShare: !!onShare, responseId });
      return;
    }
    
    try {
      setIsSharing(true);
      console.log('Calling onShare with responseId:', responseId);
      await onShare(responseId);
    } catch (error) {
      console.error('Error sharing to community:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleAddToDeck = async (deckId: string, deckTitle: string) => {
    if (responseId) {
      await trackAddToDeck(responseId, deckId, deckTitle);
    }
  };

  const handleGPTResponseAdded = (deckId: string, deckTitle: string) => {
    // Store the deck info and show navigation modal
    setAddedDeckInfo({ id: deckId, title: deckTitle });
    setShowDeckNavigationModal(true);
  };



  return (
    <div className={`px-3 py-3 rounded text-foreground w-full ${selectedDeckTitle !== 'flashcard' ? 'border-b-2 border-border' : ''}`}>
      <div className="header flex justify-between mb-2">
        {/* Left side */}
        <div className="flex pt-2 pb-1 items-center gap-3">
          {/* Header text for instruction type */}
          {type === 'instruction' && (
            <h2 className="text-primary font-bold">
              {selectedDeckTitle === 'daily summary' ? 'dojo' : 'Instructions'}
            </h2>
          )}

          {/* Action buttons for non-instruction type */}
          {type !== 'instruction' && (
            <>
              {/* Rank container */}
              {selectedDeckId && responseId && (
                <RankContainer 
                  rank={rank} 
                  onRankClick={onRankClick}
                />
              )}

              {/* Eye toggle button - only show in flashcard mode - moved to first position */}
              {selectedDeckTitle === 'flashcard' && onToggleAnswer && (
                <IconButton 
                  icon={<EyeIcon className="h-6 w-6" />}
                  alternateIcon={<EyeSlashIcon className="h-6 w-6" />}
                  isAlternateState={showAnswer}
                  onClick={onToggleAnswer}
                  tooltipContent={{
                    default: (
                      <div>
                        <div className="text-white">Show answer</div>
                        <div className="text-gray-300 flex items-center gap-1">
                          <span className="text-sm">⏎</span>
                          <span>enter</span>
                        </div>
                      </div>
                    ),
                    alternate: (
                      <div>
                        <div className="text-white">Hide answer</div>
                        <div className="text-gray-300 flex items-center gap-1">
                          <span className="text-sm">⏎</span>
                          <span>enter</span>
                        </div>
                      </div>
                    )
                  }}
                  colorScheme="blue"
                />
              )}

              {/* Breakdown button - hide in flashcard mode when content is hidden */}
              {hasExpression && (selectedDeckTitle !== 'flashcard' || showAnswer) && (
                <IconButton 
                  icon={<TableCellsIcon className="h-6 w-6" />}
                  onClick={handleBreakdownClick}
                  tooltipContent={
                    selectedDeckTitle === 'flashcard'
                      ? (
                          <div>
                            <div className="text-white">Breakdown phrase</div>
                              <div className="text-gray-300 flex items-center gap-1">
                                <span className="text-sm">/</span>
                                <span>slash</span>
                              </div>
                          </div>
                        )
                      : "Breakdown phrase"
                  }
                  buttonRef={breakdownButtonRef}
                  colorScheme="blue"
                />
              )}

              {/* Text-to-speech button - hide in flashcard mode when content is hidden */}
              {hasExpression && responseId && (selectedDeckTitle !== 'flashcard' || showAnswer) && (
                <SpeakerButton
                  responseId={responseId}
                  textToSpeak={prepareTextForSpeech(response)}
                  selectedLanguage={selectedLanguage}
                  cachedAudio={cachedAudioData}
                  buttonRef={speakerButtonRef}
                  onLoadingChange={onLoadingChange}
                  onAudioCached={(audioData) => setCachedAudioData(audioData)}
                  tooltipContent={
                    selectedDeckTitle === 'flashcard' 
                      ? (
                          <div>
                            <div className="text-white">Listen to pronunciation</div>
                            <div className="text-gray-300 flex items-center gap-1">
                              <span className="text-sm">⇧</span>
                              <span>shift</span>
                            </div>
                          </div>
                        )
                      : "Listen to pronunciation"
                  }
                  onError={(error) => {
                    setErrorMessage(error);
                    setIsErrorModalOpen(true);
                  }}
                />
              )}


            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language options dropdown - show for non-English languages except Spanish, but hide in flashcard mode */}
          {selectedLanguage !== 'en' && selectedLanguage !== 'es' && type !== 'instruction' && hasExpression && selectedDeckTitle !== 'flashcard' && (
            <div className="relative flex flex-col justify-center" ref={furiganaDropdownRef}>
              <button
                onClick={() => setShowFuriganaDropdown(!showFuriganaDropdown)}
                className="text-foreground hover:text-muted-foreground transition-colors duration-200"
              >
                <ChevronDownIcon className="h-6 w-6" />
              </button>
              {showFuriganaDropdown && (
                <div className={`absolute left-1/2 transform -translate-x-1/2 top-full mt-2 rounded-md shadow-lg bg-popover ring-1 ring-border z-[60] ${
                  isMobile 
                    ? 'min-w-[80px] w-[100px] max-w-[100px]' 
                    : 'min-w-[120px] w-max'
                }`}>
                  <div className="py-1">
                    {/* Furigana toggle - only for Japanese */}
                    {selectedLanguage === 'ja' && (
                      <button
                        onClick={handleFuriganaToggle}
                        className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent ${
                          isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                        }`}
                      >
                        <span>
                          {localFuriganaEnabled ? (
                            <span>Hide furigana</span>
                          ) : (
                            <span>Show furigana</span>
                          )}
                        </span>
                      </button>
                    )}
                    
                    {/* Kana toggle - only for Japanese */}
                    {selectedLanguage === 'ja' && (
                      <button
                        onClick={handleKanaToggle}
                        className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent ${
                          isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                        }`}
                      >
                        <span className={isMobile ? 'truncate' : ''}>
                          {localKanaEnabled ? (
                            <span>Hide kana</span>
                          ) : (
                            <span>Show kana</span>
                          )}
                        </span>
                      </button>
                    )}

                    {/* Phonetic toggle - for all supported languages */}
                    <button
                      onClick={handlePhoneticToggle}
                      className={`flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent ${
                        isMobile ? 'whitespace-normal' : 'whitespace-nowrap'
                      }`}
                    >
                      <span className={isMobile ? 'truncate' : ''}>
                        {localPhoneticEnabled ? (
                          <span>Hide romanization</span>
                        ) : (
                          <span>Show romanization</span>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quote button - always show when onQuote is available */}
          {onQuote && (
            !isMobile ? (
              <Tooltip
                content="Ask a question about this response"
                isVisible={isQuoteHovered}
                buttonRef={quoteButtonRef}
              >
                <button 
                  ref={quoteButtonRef}
                  onClick={() => {
                    // If we're in a deck, clear it and navigate to main chatbox
                    if (selectedDeckId && onDeckSelect) {
                      onDeckSelect(null, null);
                      router.push('/');
                    }
                    onQuote(response, 'input');
                  }} 
                  onMouseEnter={() => setIsQuoteHovered(true)}
                  onMouseLeave={() => setIsQuoteHovered(false)}
                  className="text-foreground hover:text-muted-foreground transition-colors duration-200"
                >
                  <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={quoteButtonRef}
                onClick={() => {
                  // If we're in a deck, clear it and navigate to main chatbox
                  if (selectedDeckId && onDeckSelect) {
                    onDeckSelect(null, null);
                    router.push('/');
                  }
                  onQuote(response, 'input');
                }} 
                className="text-foreground hover:text-muted-foreground transition-colors duration-200"
              >
                <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
              </button>
            )
          )}

          {/* Delete button */}
          {type !== 'instruction' && selectedDeckId && responseId && onDelete && (
            <DeleteIcon
              onClick={handleDeleteClick}
              disabled={isDeleting}
            />
          )}

          {/* Add to deck button - only show when not in a deck (i.e. in dojo, all responses, search) */}
          {type !== 'instruction' && type !== 'other' && !selectedDeckId && (
            !isMobile ? (
              <Tooltip
                content="Add to deck"
                isVisible={isDeckHovered}
                buttonRef={deckButtonRef}
              >
                {/* Plus button with smooth blue hover effect */}
                <button 
                  ref={deckButtonRef}
                  onClick={() => setIsDeckModalOpen(true)} 
                  onMouseEnter={() => setIsDeckHovered(true)}
                  onMouseLeave={() => setIsDeckHovered(false)}
                  className="text-foreground hover:text-blue-400 transition-colors duration-200"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={deckButtonRef}
                onClick={() => setIsDeckModalOpen(true)} 
                className="text-foreground hover:text-primary transition-colors duration-200"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ------------ GPTResponse content ------------ */}
      <div className={`whitespace-pre-wrap overflow-x-auto ${selectedDeckTitle === 'flashcard' ? 'w-full flex justify-center items-center' : 'w-[90%]'}`}>
        <ExpandableContent maxHeight={262.5} className="overflow-x-auto w-full">
          {parsedBlocks.some(items => items && items.length > 0) ? (
            // For all responses, handle numbered lists specially, use Markdown for others
            parsedBlocks.map((items, blockIdx) =>
              items && items.length > 0 ? (
                <React.Fragment key={blockIdx}>
                  {/* Check if this block contains numbered items that we want to render specially */}
                  {items.some(item => item.match(/^\s*\d+\/\s*/)) ? (
                    // If block contains exactly 2, 3, or 4 numbered items with "/" format, use StandardResponse
                    isStandardResponse(items) ? (
                      <StandardResponse 
                        items={items.filter(item => item.match(/^\s*\d+\/\s*/))} 
                        selectedLanguage={selectedLanguage}
                        responseId={responseId}
                        cachedFurigana={currentFurigana}
                        onFuriganaGenerated={handleFuriganaGenerated}
                        isFuriganaEnabled={localFuriganaEnabled}
                        isPhoneticEnabled={localPhoneticEnabled}
                        isKanaEnabled={localKanaEnabled}
                        hideContent={hideContent}
                        containerWidth={containerWidth}
                        isFlashcard={selectedDeckTitle === 'flashcard'}
                      />
                    ) : (
                      // Otherwise use the existing custom logic for other numbered items
                      <div className="pr-3 text-primary">
                        {items.map((item, idx) => {
                          const numberMatch = item.match(/^\s*(\d+)\/\s*/);
                          if (numberMatch) {
                            // This is a numbered item with "/" - convert to "." format
                            const originalNumber = numberMatch[1];
                            return (
                              <div key={idx} style={{ margin: 0, marginBottom: '0.5em', padding: 0 }}>
                                <span className="text-muted-foreground">{`${originalNumber}.`}</span>{' '}
                                {item.replace(/^\s*\d+\/\s*/, '')}
                              </div>
                            );
                          } else {
                            // This is regular text (like headers) - render as-is
                            return (
                              <div key={idx} style={{ marginBottom: '0.5em' }}>
                                {item}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )
                  ) : (
             // For all other content (tables, regular text, etc.), use Markdown
             <div className="pr-3 text-primary">
               <StyledMarkdown>
                 {items.join('\n')}
               </StyledMarkdown>
             </div>
                  )}
                  {/* Add a line break between blocks */}
                  {blockIdx < parsedBlocks.length - 1 && <div style={{height: '1em'}} />}
                </React.Fragment>
              ) : null
            )
          ) : (
            // Fallback to Markdown for non-list blocks
            <div className="pr-3 text-primary">
              <StyledMarkdown>
                {cleanResponse}
              </StyledMarkdown>
            </div>
          )}
        </ExpandableContent>
      </div>


      {/* Bottom badges/buttonsin bottom left corner */}
      {decks && Object.keys(decks).length > 0 && selectedDeckTitle !== 'flashcard' && (
        <div className="mt-2 pt-1 flex items-center gap-2">
          
          {/* Owner alias badge - show for imported responses */}
          {source === 'imported' && communityResponse?.creatorAlias && (
            <AliasBadge 
              alias={communityResponse.creatorAlias} 
              customColor={aliasColor}
              height="24px"
            />
          )}

          {/* Deck badge */}
          {(() => {
            const nonReservedTitle = Object.values(decks).find(title => 
              !reservedDeckTitles?.includes(title)
            );
            const displayTitle = nonReservedTitle || Object.values(decks)[0];
            const finalDisplayTitle = displayTitle === 'daily summary' ? 'Dojo' : displayTitle;
            const isCurrentDeck = finalDisplayTitle === selectedDeckTitle || 
                                    (displayTitle === 'daily summary' && selectedDeckTitle === 'daily summary') ||
                                    (finalDisplayTitle === 'Dojo' && selectedDeckTitle === 'daily summary');
            
            return (
              <span 
                onClick={isCurrentDeck ? undefined : handleDeckClick}
                className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 max-w-[120px] truncate ${
                  isCurrentDeck 
                    ? 'bg-muted text-muted-foreground cursor-default'
                    : 'bg-muted text-black dark:text-white cursor-pointer hover:opacity-80'
                }`}
              >
                {finalDisplayTitle}
              </span>
            );
          })()}

          {/* Share to community button - badge style */}
          {(() => {
            const shouldShow = selectedDeckId && responseId && onShare && type !== 'instruction';
            return shouldShow;
          })() && (
            <span 
              onClick={isShareDisabled ? undefined : handleShareToCommunity}
              className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 flex items-center gap-1 ${
                isShareDisabled 
                  ? 'bg-muted text-purple-600 dark:text-purple-400 cursor-not-allowed opacity-50'
                  : 'bg-muted text-purple-600 dark:text-purple-400 cursor-pointer hover:bg-accent hover:text-purple-400 dark:hover:text-purple-300'
              }`}
            >
              <ArrowUpTrayIcon className="h-3 w-3" />
              <span>share</span>
            </span>
          )}
          
          {/* Pause/Play button - conditional visibility based on deck and paused state */}
          {selectedDeckId && responseId && onPauseToggle && (
            // Show pause button only in Dojo/Daily Summary, or play button if paused (regardless of deck)
            (selectedDeckTitle === 'daily summary' || isPaused) && (
              <IconButton
                icon={<PauseCircleIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />}
                alternateIcon={<PlayCircleIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />}
                isAlternateState={isPaused}
                onClick={() => handlePauseToggle(responseId, !isPaused)}
                tooltipContent={{
                  default: "Pause cycling this response in dojo",
                  alternate: "Resume cycling this response in dojo"
                }}
                buttonRef={pauseButtonRef}
                colorScheme="green-yellow"
                className="relative group"
              />
            )
          )}
        </div>
      )}

      {/* Modals */}
      {isDeckModalOpen && (
        <DecksModal
          isOpen={isDeckModalOpen}
          onClose={() => setIsDeckModalOpen(false)}
          response={response}
          reservedDeckTitles={reservedDeckTitles}
          cachedAudio={cachedAudioData}
          desktopBreakdownContent={desktopBreakdownContent}
          mobileBreakdownContent={mobileBreakdownContent}
          furigana={currentFurigana}
          isFuriganaEnabled={localFuriganaEnabled}
          isPhoneticEnabled={localPhoneticEnabled}
          isKanaEnabled={localKanaEnabled}
          onDeckCreated={onDeckCreated}
          onDeckSelect={onDeckSelect}
          onDecksRefresh={onDecksRefresh}
          onGPTResponseAdded={handleGPTResponseAdded}
        />
      )}
      {showDeckNavigationModal && addedDeckInfo && (
        <DeckNavigationModal
          isOpen={showDeckNavigationModal}
          title="Added to Deck"
          message={`Successfully added response to '${addedDeckInfo.title}'.`}
          deckInfo={addedDeckInfo}
          onNavigateToDeck={(deckId, deckTitle) => {
            if (onDeckSelect) {
              router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
              onDeckSelect(deckId, deckTitle);
            }
          }}
          onStayHere={() => {
            setShowDeckNavigationModal(false);
            setAddedDeckInfo(null);
          }}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteGPTResponseModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {showEnhancedDeleteModal && deletionImpact && (
        <EnhancedDeleteModal
          isOpen={showEnhancedDeleteModal}
          onClose={() => {
            setShowEnhancedDeleteModal(false);
            setDeletionImpact(null);
          }}
          onConfirm={handleDeleteConfirm}
          importCount={deletionImpact.importCount}
          importerCount={deletionImpact.importerCount}
          isDeleting={isDeleting}
        />
      )}
      {isBreakdownModalOpen && (
        <BreakdownModal
          isOpen={isBreakdownModalOpen}
          onClose={() => setIsBreakdownModalOpen(false)}
          content={currentBreakdownContent}
          isLoading={isBreakdownLoading}
          isTextView={isBreakdownTextView}
          canToggle={!!(mobileBreakdownContent || desktopBreakdownContent) || !!responseId}
          originalResponse={response}
          rank={rank}
          isPaused={isPaused}
          responseId={responseId ?? null}
          selectedDeckTitle={selectedDeckTitle}
          onRankUpdate={onRankUpdate}
          onPauseToggle={onPauseToggle}
          selectedLanguage={selectedLanguage}
          onLoadingChange={onLoadingChange}
          cachedAudio={cachedAudioData}
          onAudioCached={(audioData) => setCachedAudioData(audioData)}
          onError={(error) => {
            setErrorMessage(error);
            setIsErrorModalOpen(true);
          }}
          onToggleView={handleBreakdownFormatToggle}
        />
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={errorMessage}
      />
    </div>
  );
}