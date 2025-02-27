'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, XCircleIcon, ChatBubbleLeftEllipsisIcon, ChevronUpIcon, ChevronDownIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GPTResponseProps {
  response: string;
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string;
  reservedBookmarkTitles: string[];
  responseId?: string | null;
  rank?: number;
  createdAt?: Date;
  type?: 'instruction' | 'response';
  onDelete?: (responseId: string, bookmarks: Record<string, string>) => Promise<void>;
  onQuote?: (response: string, type: 'submit' | 'input') => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  bookmarks?: Record<string, string>;
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
  onDelete, 
  onQuote,
  onRankUpdate,
  onGenerateSummary,
  bookmarks
}: GPTResponseProps) {
  const red = '#d93900'
  const yellow = '#b59f3b'
  const green = '#30642e'
  const [newRank, setNewRank] = useState(rank);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rankContainerBg, setRankContainerBg] = useState(red);
  const router = useRouter();

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
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
      }
    }
  };

  return (
    <div className="pl-3 pt-3 rounded text-white w-full">
      <div className="header flex justify-between w-[90%] mb-2 border-b-2 pb-1" style={{ borderBottomColor: yellow }}>
        <h2 className="font-bold text-blue-400">
          {type === 'instruction' ? 'Instructions:' : 'KondoAI:'}
        </h2>
        <div className="button-container flex items-center gap-2">
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
                <div className="flex items-center gap-2">
                  {(selectedBookmarkTitle === 'daily summary' || selectedBookmarkTitle === 'all responses') && bookmarks && Object.keys(bookmarks).length > 0 && (
                    <span 
                      onClick={handleBookmarkClick}
                      className="text-xs px-2 py-0.5 bg-blue-500 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors duration-200 active:bg-blue-700"
                    >
                      {Object.values(bookmarks).find(title => !reservedBookmarkTitles.includes(title)) || Object.values(bookmarks)[0]}
                    </span>
                  )}
                  <div 
                    className={"rank-container flex items-center gap-1 px-1 rounded-lg transition-colors duration-400"}
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
                </div>
              )}

              {!selectedBookmarkId && onQuote && (
                <>
                  <button 
                    onClick={() => onQuote(response, 'input')} 
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                  >
                    <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Ask a question about this response
                    </span>
                  </button>
                  <button 
                    onClick={() => onQuote(response, 'submit')} 
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                  >
                    <LightBulbIcon className="h-5 w-5" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Breakdown this response
                    </span>
                  </button>
                  <button 
                    onClick={() => setIsBookmarkModalOpen(true)} 
                    className="text-white relative group"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Add this response to bookmark
                    </span>
                  </button>
                </>
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
        <div className="pr-3">
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
    </div>
  );
}