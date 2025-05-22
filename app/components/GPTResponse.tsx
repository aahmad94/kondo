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
  LightBulbIcon,
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
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  onBookmarkSelect?: (id: string | null, title: string | null) => void;
  bookmarks?: Record<string, string>;
  selectedLanguage?: string;
  onLoadingChange?: (isLoading: boolean) => void;
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
  onLoadingChange
}: GPTResponseProps) {
  const red = '#d93900'
  const yellow = '#b59f3b'
  const green = '#2ea149'
  const blue = '#3b82f6'
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

  const hasExpression = response.match(/1\/\s*([\s\S]*?)\s*2\//) !== null;

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
    await handleRankClick(increment);
    setNewRank(increment ? rank + 1 : rank - 1);
    handleRankColorChange(newRank);
  };
  
  const handleRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankUpdate(responseId, newRank);
    }
  };
  
  const cleanResponse = response
    .replace(/^\s*<>\s*/gm, '• ')
    .replace(/^\s*-\s*/gm, '• ')
    .replace(/ {2,}$/gm, '');

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

        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        return;
      }

      onLoadingChange?.(true);
      const res = await fetch('/api/textToSpeech', {
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
        throw new Error(error.error || 'Failed to convert text to speech');
      }

      const data = await res.json();
      
      // Cache audio
      setCachedAudio({
        audio: data.audio,
        mimeType: data.mimeType
      });
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Set up audio source
      const audioBlob = new Blob(
        [Buffer.from(data.audio, 'base64')],
        { type: data.mimeType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;

      // Play audio
      await audioRef.current.play();
      setIsPlaying(true);

      // Clean up URL when audio ends
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to convert text to speech');
      setIsErrorModalOpen(true);
    } finally {
      onLoadingChange?.(false);
    }
  };

  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return (
    <div className="pl-3 pt-3 rounded text-white w-full border-b border-[#222222]">
      <div className="header flex justify-between w-[90%] mb-2 pb-1">
        {/* GPTResponse 'user' title */}
        <h2 style={{ color: type === 'instruction' ? 'yellow' : blue }}>
          {type === 'instruction' 
            ? (selectedBookmarkTitle === 'daily summary' ? 'dojo' : 'Instructions')
            : 'KondoAI'}
        </h2>

        <div className="flex items-center gap-3">
          {/* --- Top right buttons for all GPTResponses --- */}
          <>
          {/* Refresh button for Dojo mode */}
          {type === 'instruction' && selectedBookmarkTitle === 'daily summary' && (
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
          )}

          {/* --- set of top right buttons for responses --- */}

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
          </>

          {/* --- Top right buttons for chatbox specific GPTResponses --- */}
          {type !== 'instruction' && !selectedBookmarkId && onQuote && (
            <div className='flex items-center gap-3'>
              
              {/* Breakdown button */}
              {hasExpression && (
                <Tooltip
                  content="Breakdown this response"
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
                    <LightBulbIcon className="h-6 w-6" />
                  </button>
                </Tooltip>
              )}

              {/* Text-to-speech button */}
              {hasExpression && (
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
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                  >
                    <SpeakerWaveIcon className="h-6 w-6" />
                  </button>
                </Tooltip>
              )}

              {/* Quote button */}
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

              {/* Add to bookmark button */}
              <Tooltip
                content="Add to bookmark"
                isVisible={isBookmarkHovered}
                buttonRef={bookmarkButtonRef}
              >
                <button 
                  ref={bookmarkButtonRef}
                  onClick={() => setIsBookmarkModalOpen(true)} 
                  onMouseEnter={() => setIsBookmarkHovered(true)}
                  onMouseLeave={() => setIsBookmarkHovered(false)}
                  className="text-white relative group"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* GPTResponse content */}
      <div className="whitespace-pre-wrap overflow-x-auto w-[90%]">
        <div className="pr-3" style={{ color: yellow }}>
          <div className="overflow-x-auto w-full">
            <Markdown remarkPlugins={[remarkGfm]}>{cleanResponse}</Markdown>
          </div>
        </div>
      </div>

      {/* Bottom action buttons for when in a bookmark */}
      <div className="button-container flex items-center gap-3 mt-3 pb-2">
        {type === 'response' && selectedBookmarkId && (
          <>
            {/* GPTResponse interactive items */}
            {selectedBookmarkId && responseId && (
              <div className="flex items-center gap-3">

                {/* Rank container */}
                <div
                  className={"rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"}
                  style={{
                    border: `3px solid ${rankContainerOutline}`,
                    backgroundColor: '#111111'
                  }}
                >
                  <Tooltip
                    content="Rank higher to surface less"
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
                  <span className={`px-1.5 rounded text-xs text-white`}>
                    {rank}
                  </span>
                  <Tooltip
                    content="Rank lower to surface more"
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
                </div>

                {/* Bookmark badge -- show when in reserved bookmark */}
                {(selectedBookmarkTitle === 'daily summary' || selectedBookmarkTitle === 'all responses' || selectedBookmarkTitle === 'search') && bookmarks && Object.keys(bookmarks).length > 0 && (
                  <span 
                    onClick={handleBookmarkClick}
                    className="text-xs px-2 py-1 bg-blue-500 rounded-sm cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700 max-w-[100px] truncate"
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
                )}

                {/* Pause button */}
                {onPauseToggle && (
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
                      onClick={() => onPauseToggle(responseId!, !isPaused)}
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
                )}

                {/* Breakdown button */}
                {hasExpression && (
                  <Tooltip
                    content="Breakdown this response"
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
                      <LightBulbIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                )}

                {/* Text-to-speech button */}
                {hasExpression && (
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
                      className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                    >
                      <SpeakerWaveIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isBookmarkModalOpen && (
        <BookmarksModal
          isOpen={isBookmarkModalOpen}
          onClose={() => setIsBookmarkModalOpen(false)}
          response={response}
          reservedBookmarkTitles={reservedBookmarkTitles}
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