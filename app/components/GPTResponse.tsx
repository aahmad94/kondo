'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  XCircleIcon, 
  ChatBubbleLeftEllipsisIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import BreakdownModal from './BreakdownModal';
import ErrorModal from './ErrorModal';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Tooltip from './Tooltip';
import { trackBreakdownClick, trackSpeakerClick, trackPauseToggle, trackChangeRank, trackAddToBookmark } from '../../lib/amplitudeService';
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
  type?: 'instruction' | 'response';
  isPaused?: boolean;
  onDelete?: (responseId: string, bookmarks: Record<string, string>) => Promise<void>;
  onQuote?: (response: string, type: 'submit' | 'breakdown' | 'input') => void;
  onBookmarkCreated?: (newBookmark: { id: string, title: string }) => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  onBookmarkSelect?: (id: string | null, title: string | null) => void;
  bookmarks?: Record<string, string>;
  selectedLanguage?: string;
  onLoadingChange?: (isLoading: boolean) => void;
  onBreakdownClick?: () => void;
  onSpeakerClick?: () => void;
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
  onDelete, 
  onQuote,
  onRankUpdate,
  onPauseToggle,
  onGenerateSummary,
  onBookmarkSelect,
  bookmarks,
  selectedLanguage = 'ja',
  onLoadingChange,
  onBreakdownClick,
  onSpeakerClick,
  onBookmarkCreated
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
  const [rankContainerOutline, setRankContainerOutline] = useState(red);
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isSpeakerHovered, setIsSpeakerHovered] = useState(false);
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isBreakdownHovered, setIsBreakdownHovered] = useState(false);
  const [isBookmarkHovered, setIsBookmarkHovered] = useState(false);
  const quoteButtonRef = React.useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = React.useRef<HTMLButtonElement>(null);
  const refreshButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownContent, setBreakdownContent] = useState('');
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const upChevronRef = React.useRef<HTMLButtonElement>(null);
  const downChevronRef = React.useRef<HTMLButtonElement>(null);
  const [isUpChevronHovered, setIsUpChevronHovered] = useState(false);
  const [isDownChevronHovered, setIsDownChevronHovered] = useState(false);
  const [cachedAudio, setCachedAudio] = useState<{audio: string, mimeType: string} | null>(null);
  const { isMobile, offset } = useIsMobile();

  // Helper to check if a block should use StandardResponse styling
  const isStandardResponse = (items: string[]) => [2, 3, 4].includes(items.filter(item => item.match(/^\s*\d+\/\s*/)).length);

  // Extract expressions for voice and breakdown logic
  function extractExpressions(response: string): string[] {
    // If the first line doesn't include a number, return an empty array
    // hasExpression will be false, and the response will be rendered as a regular text
    // speaker and breakdown buttons will not be shown
    const firstLineIncludesNumber = response.split('\n')[0].includes('1/');
    if (!firstLineIncludesNumber) {
      return [];
    }

    // Find all numbered items (e.g., 1/ ... 2/ ... 3/ ...)
    const numberedItems: RegExpMatchArray[] = [...response.matchAll(/^\d+\/\s*(.*)$/gm)];
    const notStandardList = numberedItems.some(item => item[0].includes('5/'));
    let expressions: string[] = [];
    // If 5 or more, return all content after each number-slash
    if (notStandardList) {
      // expressions = numberedItems
      //   .map((match: RegExpMatchArray) => match[1].trim())
      //   .filter((item: string) => !!item);
      return [];
    } else {
      expressions = numberedItems
        .map((match: RegExpMatchArray) => (match[0].includes('1/') ? match[1].trim() : undefined))
        .filter((item: string | undefined): item is string => !!item);
    }
    return expressions.filter(Boolean);
  }

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


  useEffect(() => {
    handleRankColorChange(rank);
  }, [rank]);
  
  const handleRankColorChange = (rank: number) => {
    if (rank == 1) {
      setRankContainerOutline(red);
    } else if (rank == 2) {
      setRankContainerOutline(yellow);
    } else if (rank == 3) {
      setRankContainerOutline(green);
    }
  }

  const onRankClick = async (increment: boolean) => {
    const calculatedNewRank = increment ? rank + 1 : rank - 1;
    await handleRankClick(increment);
    setNewRank(calculatedNewRank);
    handleRankColorChange(calculatedNewRank);
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
      if (breakdownContent) {
        setBreakdownContent(breakdownContent);
        setIsBreakdownModalOpen(true);
        if (responseId) await trackBreakdownClick(responseId);
        return;
      }

      onLoadingChange?.(true);
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: response,
          language: selectedLanguage,
          responseId: responseId
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate breakdown');
      }

      const data = await res.json();
      setBreakdownContent(data.breakdown);
      setIsBreakdownModalOpen(true);
      if (responseId) await trackBreakdownClick(responseId);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate breakdown');
      setIsErrorModalOpen(true);
    } finally {
      onLoadingChange?.(false);
    }
  };

  const handleTextToSpeech = async () => {
    if (!responseId) return;

    try {
      // If already playing, pause and reset
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (cachedAudio) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const audioBlob = new Blob(
          [Buffer.from(cachedAudio.audio, 'base64')],
          { type: cachedAudio.mimeType }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;

        await audioRef.current.play();
        setIsPlaying(true);
        await trackSpeakerClick(responseId);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          setErrorMessage('Error playing audio');
        };
        return;
      }

      onLoadingChange?.(true);
      
      // Extract only Japanese terms for text-to-speech
      let textToSpeak = expressions.join('\n');
      if (response.includes(' - ')) {
        // This is a terms function output:
            // 1/ ウェブサイト (うぇぶさいと, uebusaito) - website
            // 2/ インターネット (いんたーねっと, intānetto) - internet
        // modify to extract only the Japanese terms:
            // 1/ ウェブサイト
            // 2/ インターネット
        textToSpeak = response
          .split('\n')
          .map(line => {
            const match = line.match(/^([^（(]+)/);
            return match ? match[1].trim() : '';
          })
          .filter(Boolean)
          .join('\n');
      }

      const res = await fetch('/api/textToSpeech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: textToSpeak,
          language: selectedLanguage,
          responseId: responseId
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const data = await res.json();
      setCachedAudio(data);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audioBlob = new Blob(
        [Buffer.from(data.audio, 'base64')],
        { type: data.mimeType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;

      await audioRef.current.play();
      setIsPlaying(true);
      await trackSpeakerClick(responseId);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setErrorMessage('Error playing audio');
      };
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate speech');
      setIsErrorModalOpen(true);
    } finally {
      onLoadingChange?.(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!responseId || !onPauseToggle) return;
    await onPauseToggle(responseId, !isPaused);
    await trackPauseToggle(!isPaused);
  };

  const handleAddToBookmark = async (bookmarkId: string, bookmarkTitle: string) => {
    if (responseId) {
      await trackAddToBookmark(responseId, bookmarkId, bookmarkTitle);
    }
  };

  // Clean up audio element on unmount and reset isPlaying, matching GPTResponseDemo
  useEffect(() => {
    let isUnmounted = false;
    const audio = audioRef.current;

    if (audio) {
      const handleEnded = () => {
        if (!isUnmounted) setIsPlaying(false);
      };
      const handleError = () => {
        if (!isUnmounted) {
          setIsPlaying(false);
          setErrorMessage('Error playing audio');
        }
      };
      audio.onended = handleEnded;
      audio.onerror = handleError;
    }

    return () => {
      isUnmounted = true;
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.onended = null;
        audio.onerror = null;
      }
    };
  }, [response]);

  return (
    <div className="pl-3 py-3 rounded text-white w-full border-b border-[#222222]">
      <div className="header flex justify-between mb-2">
        {/* Left side */}
        <div className="flex pt-2 pb-1 items-center gap-3">
          {/* Header text for instruction type */}
          {type === 'instruction' && (
            <h2 style={{ color: 'yellow' }}>
              {selectedBookmarkTitle === 'daily summary' ? 'dojo' : 'Instructions'}
            </h2>
          )}

          {/* Action buttons for non-instruction type */}
          {type !== 'instruction' && (
            <>
              {/* Rank container */}
              {selectedBookmarkId && responseId && (
                <div
                  className={"rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"}
                  style={{
                    border: `3px solid ${rankContainerOutline}`,
                    backgroundColor: '#111111'
                  }}
                >
                  {!isMobile ? (
                    <Tooltip
                      content="Rank higher"
                      isVisible={isUpChevronHovered}
                      buttonRef={upChevronRef}
                    >
                      <button
                        ref={upChevronRef}
                        onClick={() => onRankClick(true)}
                        disabled={rank >= 3}
                        className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                        onMouseEnter={() => setIsUpChevronHovered(true)}
                        onMouseLeave={() => setIsUpChevronHovered(false)}
                      >
                        <ChevronUpIcon className="h-5 w-5" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      ref={upChevronRef}
                      onClick={() => onRankClick(true)}
                      disabled={rank >= 3}
                      className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    >
                      <ChevronUpIcon className="h-5 w-5" />
                    </button>
                  )}
                  <span className={`px-1.5 rounded text-xs text-white`}>
                    {rank}
                  </span>
                  {!isMobile ? (
                    <Tooltip
                      content="Rank lower"
                      isVisible={isDownChevronHovered}
                      buttonRef={downChevronRef}
                    >
                      <button
                        ref={downChevronRef}
                        onClick={() => onRankClick(false)}
                        disabled={rank <= 1}
                        className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                        onMouseEnter={() => setIsDownChevronHovered(true)}
                        onMouseLeave={() => setIsDownChevronHovered(false)}
                      >
                        <ChevronDownIcon className="h-5 w-5" />
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      ref={downChevronRef}
                      onClick={() => onRankClick(false)}
                      disabled={rank <= 1}
                      className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    >
                      <ChevronDownIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Pause button */}
              {selectedBookmarkId && responseId && onPauseToggle && (
                !isMobile ? (
                  <Tooltip
                    content={isPaused 
                      ? "Resume cycling this response in dojo" 
                      : "Pause cycling this response in dojo"
                    }
                    isVisible={isHovered}
                    buttonRef={pauseButtonRef}
                  >
                    <button 
                      ref={pauseButtonRef}
                      onClick={handlePauseToggle}
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                      className={`relative group ${isPaused ? 'text-green-500 hover:text-green-700' : 'text-yellow-500 hover:text-yellow-700'} transition-colors duration-200`}
                    >
                      {isPaused ? (
                        <PlayCircleIcon className="h-6 w-6" />
                      ) : (
                        <PauseCircleIcon className="h-6 w-6" />
                      )}
                    </button>
                  </Tooltip>
                ) : (
                  <button 
                    ref={pauseButtonRef}
                    onClick={handlePauseToggle}
                    className={`relative group ${isPaused ? 'text-green-500 hover:text-green-700' : 'text-yellow-500 hover:text-yellow-700'} transition-colors duration-200`}
                  >
                    {isPaused ? (
                      <PlayCircleIcon className="h-6 w-6" />
                    ) : (
                      <PauseCircleIcon className="h-6 w-6" />
                    )}
                  </button>
                )
              )}

              {/* Breakdown button */}
              {hasExpression && (
                !isMobile ? (
                  <Tooltip
                    content="Breakdown"
                    isVisible={isBreakdownHovered}
                    buttonRef={breakdownButtonRef}
                  >
                    <button 
                      ref={breakdownButtonRef}
                      onClick={handleBreakdownClick}
                      onMouseEnter={() => setIsBreakdownHovered(true)}
                      onMouseLeave={() => setIsBreakdownHovered(false)}
                      className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                    >
                      <MagnifyingGlassIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                ) : (
                  <button 
                    ref={breakdownButtonRef}
                    onClick={handleBreakdownClick}
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                  >
                    <MagnifyingGlassIcon className="h-6 w-6" />
                  </button>
                )
              )}

              {/* Text-to-speech button */}
              {hasExpression && (
                !isMobile ? (
                  <Tooltip
                    content="Listen to pronunciation"
                    isVisible={isSpeakerHovered}
                    buttonRef={speakerButtonRef}
                  >
                    <button 
                      ref={speakerButtonRef}
                      onClick={handleTextToSpeech}
                      onMouseEnter={() => setIsSpeakerHovered(true)}
                      onMouseLeave={() => setIsSpeakerHovered(false)}
                      className={`transition-colors duration-200 ${
                        isPlaying
                          ? 'text-green-400 hover:text-green-600'
                          : 'text-blue-400 hover:text-blue-700'
                      } relative group`}
                    >
                      <SpeakerWaveIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                ) : (
                  <button 
                    ref={speakerButtonRef}
                    onClick={handleTextToSpeech}
                    className={`transition-colors duration-200 ${
                      isPlaying
                        ? 'text-green-400 hover:text-green-600'
                        : 'text-blue-400 hover:text-blue-700'
                    } relative group`}
                  >
                    <SpeakerWaveIcon className="h-6 w-6" />
                  </button>
                )
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
                      className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                    >
                      <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                ) : (
                  <button 
                    ref={quoteButtonRef}
                    onClick={() => onQuote(response, 'input')} 
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                  >
                    <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
                  </button>
                )
              )}
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Refresh button for Dojo mode */}
          {type === 'instruction' && selectedBookmarkTitle === 'daily summary' && (
            !isMobile ? (
              <Tooltip
                content="Refresh dojo summary"
                isVisible={isHovered}
                buttonRef={refreshButtonRef}
              >
                <button
                  ref={refreshButtonRef}
                  onClick={() => onGenerateSummary?.(true)}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
                >
                  <ArrowPathIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button
                ref={refreshButtonRef}
                onClick={() => onGenerateSummary?.(true)}
                className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
              >
                <ArrowPathIcon className="h-6 w-6" />
              </button>
            )
          )}

          {/* Delete button */}
          {type !== 'instruction' && selectedBookmarkId && responseId && onDelete && (
            <button 
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors duration-200"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          )}

          {/* Add to bookmark button - only show when not in a bookmark */}
          {type !== 'instruction' && !selectedBookmarkId && (
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
                  className="text-white hover:text-blue-400 transition-colors duration-200 px-3"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={bookmarkButtonRef}
                onClick={() => setIsBookmarkModalOpen(true)} 
                className="text-white hover:text-blue-400 transition-colors duration-200 px-3"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            )
          )}
        </div>
      </div>

      {/* ------------ GPTResponse content ------------ */}
      <div className="whitespace-pre-wrap overflow-x-auto w-[90%]">
        {parsedBlocks.some(items => items && items.length > 0) ? (
          // For all responses, handle numbered lists specially, use Markdown for others
          parsedBlocks.map((items, blockIdx) =>
            items && items.length > 0 ? (
              <React.Fragment key={blockIdx}>
                {/* Check if this block contains numbered items that we want to render specially */}
                {items.some(item => item.match(/^\s*\d+\/\s*/)) ? (
                  // If block contains exactly 2, 3, or 4 numbered items with "/" format, use StandardResponse
                  isStandardResponse(items) ? (
                    <StandardResponse items={items.filter(item => item.match(/^\s*\d+\/\s*/))} />
                  ) : (
                    // Otherwise use the existing custom logic for other numbered items
                    <div className="pr-3" style={{ color: yellow }}>
                      {items.map((item, idx) => {
                        const numberMatch = item.match(/^\s*(\d+)\/\s*/);
                        if (numberMatch) {
                          // This is a numbered item with "/" - convert to "." format
                          const originalNumber = numberMatch[1];
                          return (
                            <div key={idx} style={{ margin: 0, marginBottom: '0.5em', padding: 0 }}>
                              <span style={{ color: '#575b63' }}>{`${originalNumber}.`}</span>{' '}
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
                  <div className="pr-3" style={{ color: yellow }}>
                    <div className="overflow-x-auto w-full">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {items.join('\n')}
                      </Markdown>
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
          <div className="pr-3" style={{ color: yellow }}>
            <div className="overflow-x-auto w-full">
              <Markdown remarkPlugins={[remarkGfm]}>{cleanResponse}</Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Bookmark badge -- show when in reserved bookmark, now below the content */}
      {(selectedBookmarkTitle === 'daily summary' || selectedBookmarkTitle === 'all responses' || selectedBookmarkTitle === 'search') && bookmarks && Object.keys(bookmarks).length > 0 && (
        <div className="mt-2 pt-1flex items-start">
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
        </div>
      )}

      {/* Modals */}
      {isBookmarkModalOpen && (
        <BookmarksModal
          isOpen={isBookmarkModalOpen}
          onClose={() => setIsBookmarkModalOpen(false)}
          response={response}
          reservedBookmarkTitles={reservedBookmarkTitles}
          cachedAudio={cachedAudio}
          breakdownContent={breakdownContent}
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
          breakdown={breakdownContent}
          rank={rank}
          isPaused={isPaused}
          responseId={responseId ?? null}
          onRankUpdate={onRankUpdate}
          onPauseToggle={onPauseToggle}
          onTextToSpeech={handleTextToSpeech}
          isPlaying={isPlaying}
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