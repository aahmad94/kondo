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
  PlayCircleIcon 
} from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import BreakdownModal from './BreakdownModal';
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
  const green = '#30642e'
  const blue = '#3b82f6'
  const white = '#fff'
  const [newRank, setNewRank] = useState(rank);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rankContainerBg, setRankContainerBg] = useState(red);
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isBreakdownHovered, setIsBreakdownHovered] = useState(false);
  const [isBookmarkHovered, setIsBookmarkHovered] = useState(false);
  const quoteButtonRef = React.useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = React.useRef<HTMLButtonElement>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownContent, setBreakdownContent] = useState('');

  useEffect(() => {
    handleRankColorChange(rank);
  }, [rank]);

  const handleRankColorChange = (rank: number) => {
    if (rank == 1) {
      setRankContainerBg(red);
    } else if (rank == 2) {
      setRankContainerBg(yellow);
    } else if (rank == 3) {
      setRankContainerBg(green);
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
      onLoadingChange?.(true);
      const res = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `* Breakdown the following phrase:\n\n${response}`,
          languageCode: selectedLanguage,
          model: 'gpt-4o-mini'
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setBreakdownContent(data.result);
      setIsBreakdownModalOpen(true);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
    } finally {
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="pl-3 pt-3 rounded text-white w-full">
      <div className="header flex justify-between w-[90%] mb-2 pb-1">
        <h2 style={{ color: type === 'instruction' ? 'yellow' : blue }}>
          {type === 'instruction' 
            ? (selectedBookmarkTitle === 'daily summary' ? 'dojo:' : 'Instructions:')
            : 'KondoAI'}
        </h2>
        <div className="button-container flex items-center gap-3">
          {selectedBookmarkTitle === 'daily summary' && type === 'instruction' && (
            <button
              onClick={() => onGenerateSummary?.(true)}
              className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          )}
          {type === 'response' && (
            <>
              {selectedBookmarkId && responseId && (
                <div className="flex items-center gap-3">
                  {(selectedBookmarkTitle === 'daily summary' || selectedBookmarkTitle === 'all responses' || selectedBookmarkTitle === 'search') && bookmarks && Object.keys(bookmarks).length > 0 && (
                    <span 
                      onClick={handleBookmarkClick}
                      className="text-xs px-2 py-0.5 bg-blue-500 rounded-sm cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700"
                    >
                      {(() => {
                        // Find a non-reserved bookmark title
                        const nonReservedTitle = Object.values(bookmarks).find(title => 
                          !reservedBookmarkTitles.includes(title)
                        );
                        
                        // If found, return it, otherwise check if it's daily summary
                        if (nonReservedTitle) return nonReservedTitle;
                        
                        // Check if the first bookmark is 'daily summary'
                        const firstTitle = Object.values(bookmarks)[0];
                        return firstTitle === 'daily summary' ? 'Dojo' : firstTitle;
                      })()}
                    </span>
                  )}
                  <div 
                    className={"rank-container flex items-center gap-1 px-1 rounded-sm transition-colors duration-400"}
                    style={{ backgroundColor: rankContainerBg }}
                  >
                    <button 
                      onClick={() => onRankClick(true)}
                      disabled={rank >= 3}
                      className="text-white hover:text-gray-200 disabled:opacity-50 transition-colors duration-400 font-bold"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <span className={`text-sm px-1 rounded text-white`}>
                      {rank}
                    </span>
                    <button 
                      onClick={() => onRankClick(false)}
                      disabled={rank <= 1}
                      className="text-white hover:text-gray-200 disabled:opacity-50 transition-colors duration-400 font-bold"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
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
                      className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
                    >
                      <LightBulbIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
                </div>
              )}

              {!selectedBookmarkId && onQuote && (
                <div className='flex items-center gap-3'>
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
                      <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                    </button>
                  </Tooltip>
                  <Tooltip
                    content="Breakdown this response"
                    isVisible={isBreakdownHovered}
                    buttonRef={breakdownButtonRef}
                  >
                    <button 
                      ref={breakdownButtonRef}
                      onClick={() => onQuote(response, 'breakdown')} 
                      onMouseEnter={() => setIsBreakdownHovered(true)}
                      onMouseLeave={() => setIsBreakdownHovered(false)}
                      className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                    >
                      <LightBulbIcon className="h-6 w-6" />
                    </button>
                  </Tooltip>
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
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>
              )}

              {selectedBookmarkId && responseId && onDelete && (
                <button 
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors duration-200"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {/* GPT Response content */}
      <div className="whitespace-pre-wrap overflow-x-auto w-[90%]">
        <div className="pr-3" style={{ color: yellow }}>
          <Markdown remarkPlugins={[remarkGfm]} className="overflow-hidden">{cleanResponse}</Markdown>
        </div>
      </div>
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
        />
      )}
    </div>
  );
}