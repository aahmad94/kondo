'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  EyeSlashIcon
} from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import BreakdownModal from './BreakdownModal';
import ErrorModal from './ErrorModal';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';
import IconButton from './ui/IconButton';
import { StyledMarkdown } from './ui';
import Tooltip from './Tooltip';
import { trackBreakdownClick, trackPauseToggle, trackChangeRank, trackAddToBookmark } from '../../lib/amplitudeService';
import { extractExpressions } from '../../lib/expressionUtils';
import { prepareTextForSpeech } from '../../lib/audioUtils';
import { useTheme } from '../contexts/ThemeContext';

import { useIsMobile } from '../hooks/useIsMobile';
import StandardResponse from './StandardResponse';

interface GPTResponseProps {
  response: string;
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string | null;
  reservedBookmarkTitles: string[];
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
  hideContent?: boolean;
  showAnswer?: boolean;
  onToggleAnswer?: () => void;
  onDelete?: (responseId: string, bookmarks: Record<string, string>) => Promise<void>;
  onQuote?: (response: string, type: 'submit' | 'breakdown' | 'input') => void;
  onBookmarkCreated?: (newBookmark: { id: string, title: string }) => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onFuriganaToggle?: (responseId: string, isFuriganaEnabled: boolean) => Promise<void>;
  onPhoneticToggle?: (responseId: string, isPhoneticEnabled: boolean) => Promise<void>;
  onKanaToggle?: (responseId: string, isKanaEnabled: boolean) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  onBookmarkSelect?: (id: string | null, title: string | null) => void;
  bookmarks?: Record<string, string>;
  selectedLanguage?: string;
  onLoadingChange?: (isLoading: boolean) => void;
  onBreakdownClick?: () => void;
  containerWidth?: number;
}

export default function GPTResponse({ 
  response, 
  selectedBookmarkId, 
  selectedBookmarkTitle,
  reservedBookmarkTitles,
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
  onBookmarkSelect,
  bookmarks,
  selectedLanguage = 'ja',
  onLoadingChange,
  onBreakdownClick,
  onBookmarkCreated,
  containerWidth
}: GPTResponseProps) {
  const red = '#d93900'
  const yellow = '#b59f3b'
  const brightYellow = '#ecc94b'
  const green = '#2ea149'
  const blue = '#3b82f6'
  const lightBlue = '#63b3ed'
  const white = '#fff'
  const [newRank, setNewRank] = useState(rank);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isBookmarkHovered, setIsBookmarkHovered] = useState(false);
  const quoteButtonRef = React.useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = React.useRef<HTMLButtonElement>(null);
  const refreshButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [desktopBreakdownContent, setDesktopBreakdownContent] = useState(breakdown || '');
  const [mobileBreakdownContent, setMobileBreakdownContent] = useState(mobileBreakdown || '');
  const [currentBreakdownContent, setCurrentBreakdownContent] = useState('');
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [isBreakdownTextView, setIsBreakdownTextView] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { isMobile, offset } = useIsMobile();
  
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

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!responseId || isDeleting || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(responseId, bookmarks || {});
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting response:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBookmarkClick = () => {
    if (bookmarks && Object.keys(bookmarks).length > 0) {
      // Find the first non-reserved bookmark by checking each ID and title pair
      const nonReservedBookmarkEntry = Object.entries(bookmarks).find(([id, title]) => 
        !reservedBookmarkTitles.includes(title)
      );
      
      if (nonReservedBookmarkEntry) {
        const [bookmarkId, bookmarkTitle] = nonReservedBookmarkEntry;
        // Update URL
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
        // Call the parent's callback to update state
        onBookmarkSelect?.(bookmarkId, bookmarkTitle);
      } else {
        // If no non-reserved bookmark is found, use the first bookmark
        const [bookmarkId, bookmarkTitle] = Object.entries(bookmarks)[0];
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
        onBookmarkSelect?.(bookmarkId, bookmarkTitle);
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

  const handleBreakdownToggle = async (toTextView: boolean, showExternalLoading: boolean = false) => {
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

  const handleAddToBookmark = async (bookmarkId: string, bookmarkTitle: string) => {
    if (responseId) {
      await trackAddToBookmark(responseId, bookmarkId, bookmarkTitle);
    }
  };



  return (
    <div className={`pl-3 py-3 rounded text-foreground w-full ${selectedBookmarkTitle !== 'flashcard' ? 'border-b border-border' : ''}`}>
      <div className="header flex justify-between mb-2">
        {/* Left side */}
        <div className="flex pt-2 pb-1 items-center gap-3">
          {/* Header text for instruction type */}
          {type === 'instruction' && (
            <h2 className="text-primary font-bold">
              {selectedBookmarkTitle === 'daily summary' ? 'dojo' : 'Instructions'}
            </h2>
          )}

          {/* Action buttons for non-instruction type */}
          {type !== 'instruction' && (
            <>
              {/* Rank container */}
              {selectedBookmarkId && responseId && (
                <RankContainer 
                  rank={rank} 
                  onRankClick={onRankClick}
                />
              )}

              {/* Eye toggle button - only show in flashcard mode - moved to first position */}
              {selectedBookmarkTitle === 'flashcard' && onToggleAnswer && (
                <IconButton 
                  icon={<EyeIcon className="h-6 w-6" />}
                  alternateIcon={<EyeSlashIcon className="h-6 w-6" />}
                  isAlternateState={showAnswer}
                  onClick={onToggleAnswer}
                  tooltipContent={showAnswer ? "Hide answer" : "Show answer"}
                  colorScheme="blue"
                />
              )}

              {/* Breakdown button - hide in flashcard mode when content is hidden */}
              {hasExpression && (selectedBookmarkTitle !== 'flashcard' || showAnswer) && (
                <IconButton 
                  icon={<TableCellsIcon className="h-6 w-6" />}
                  onClick={handleBreakdownClick}
                  tooltipContent="Breakdown phrase"
                  buttonRef={breakdownButtonRef}
                  colorScheme="blue"
                />
              )}

              {/* Text-to-speech button - hide in flashcard mode when content is hidden */}
              {hasExpression && responseId && (selectedBookmarkTitle !== 'flashcard' || showAnswer) && (
                <SpeakerButton
                  responseId={responseId}
                  textToSpeak={prepareTextForSpeech(response)}
                  selectedLanguage={selectedLanguage}
                  cachedAudio={null}
                  buttonRef={speakerButtonRef}
                  onLoadingChange={onLoadingChange}
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
          {selectedLanguage !== 'en' && selectedLanguage !== 'es' && type !== 'instruction' && hasExpression && selectedBookmarkTitle !== 'flashcard' && (
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

          {/* Quote button - only show when not in a bookmark */}
          {!selectedBookmarkId && onQuote && (
            !isMobile ? (
              <Tooltip
                content="Ask a question about this response"
                isVisible={isQuoteHovered}
                buttonRef={quoteButtonRef}
              >
                <button 
                  ref={quoteButtonRef}
                  onClick={() => onQuote(response, 'input')} 
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
                onClick={() => onQuote(response, 'input')} 
                className="text-foreground hover:text-muted-foreground transition-colors duration-200"
              >
                <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
              </button>
            )
          )}

          {/* Delete button */}
          {type !== 'instruction' && selectedBookmarkId && responseId && onDelete && (
            <button 
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors duration-200"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          )}

          {/* Add to bookmark button - only show when not in a bookmark */}
          {type !== 'instruction' && type !== 'other' && !selectedBookmarkId && (
            !isMobile ? (
              <Tooltip
                content="Add to bookmark"
                isVisible={isBookmarkHovered}
                buttonRef={bookmarkButtonRef}
              >
                {/* Plus button with smooth blue hover effect */}
                <button 
                  ref={bookmarkButtonRef}
                  onClick={() => setIsBookmarkModalOpen(true)} 
                  onMouseEnter={() => setIsBookmarkHovered(true)}
                  onMouseLeave={() => setIsBookmarkHovered(false)}
                  className="text-foreground hover:text-blue-400 transition-colors duration-200"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={bookmarkButtonRef}
                onClick={() => setIsBookmarkModalOpen(true)} 
                className="text-foreground hover:text-primary transition-colors duration-200"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ------------ GPTResponse content ------------ */}
      <div className={`whitespace-pre-wrap overflow-x-auto ${selectedBookmarkTitle === 'flashcard' ? 'w-full flex justify-center items-center' : 'w-[90%]'}`}>
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
                      isFlashcard={selectedBookmarkTitle === 'flashcard'}
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
             <div className="overflow-x-auto w-full">
               <StyledMarkdown>
                 {items.join('\n')}
               </StyledMarkdown>
             </div>
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
            <div className="overflow-x-auto w-full">
              <StyledMarkdown>
                {cleanResponse}
              </StyledMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Bookmark badge in bottom left corner with pause toggle */}
      {(selectedBookmarkTitle === 'daily summary' || selectedBookmarkTitle === 'all responses' || selectedBookmarkTitle === 'search') && bookmarks && Object.keys(bookmarks).length > 0 && (
        <div className="mt-2 pt-1 flex items-center gap-2">
          <span 
            onClick={handleBookmarkClick}
            className="text-xs px-2 py-1 bg-blue-500 rounded-sm cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700 max-w-[120px] truncate"
          >
            {(() => {
              const nonReservedTitle = Object.values(bookmarks).find(title => 
                !reservedBookmarkTitles.includes(title)
              );
              if (nonReservedTitle) return nonReservedTitle;
              const firstTitle = Object.values(bookmarks)[0];
              return firstTitle === 'daily summary' ? 'Dojo' : firstTitle;
            })()}
          </span>
          
          {/* Pause button - only show when bookmark is "daily summary" */}
          {selectedBookmarkTitle === 'daily summary' && selectedBookmarkId && responseId && onPauseToggle && (
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
          )}
        </div>
      )}

      {/* Modals */}
      {isBookmarkModalOpen && (
        <BookmarksModal
          isOpen={isBookmarkModalOpen}
          onClose={() => setIsBookmarkModalOpen(false)}
          response={response}
          reservedBookmarkTitles={reservedBookmarkTitles}
          cachedAudio={null}
          desktopBreakdownContent={desktopBreakdownContent}
          mobileBreakdownContent={mobileBreakdownContent}
          furigana={currentFurigana}
          isFuriganaEnabled={localFuriganaEnabled}
          isPhoneticEnabled={localPhoneticEnabled}
          isKanaEnabled={localKanaEnabled}
          onBookmarkCreated={onBookmarkCreated}
          onBookmarkSelect={onBookmarkSelect}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteGPTResponseModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
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
          selectedBookmarkTitle={selectedBookmarkTitle}
          onRankUpdate={onRankUpdate}
          onPauseToggle={onPauseToggle}
          selectedLanguage={selectedLanguage}
          onLoadingChange={onLoadingChange}
          onError={(error) => {
            setErrorMessage(error);
            setIsErrorModalOpen(true);
          }}
          onToggleView={handleBreakdownToggle}
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