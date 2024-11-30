import React, { useState, useEffect } from 'react';
import { PlusIcon, XCircleIcon, ArrowUturnRightIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
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
  onDelete?: (responseId: string) => Promise<void>;
  onQuote?: (response: string) => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
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
  onRankUpdate 
}: GPTResponseProps) {
  const red = '#d93900'
  const grey = '#161b1d'
  const green = '#30642e'
  const [newRank, setNewRank] = useState(rank);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rankContainerBg, setRankContainerBg] = useState(grey);

  useEffect(() => {
    handleRankColorChange(rank);
    console.log('response');
    console.log(response);
    console.log(cleanResponse);
  }, [rank]);

  const handleRankColorChange = (rank: number) => {
    if (rank == 1) {
      setRankContainerBg(red);
    } else if (rank == 2) {
      setRankContainerBg(grey);
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
    .replace(/\n\n/gm, '\n')
    .replace(/^\s*-\s*/gm, '<> ')
    .replace(/ {2}$/gm, '');

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBookmarkId || !responseId || isDeleting || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(responseId);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting response:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuoteClick = () => {
    if (onQuote) {
      onQuote(response);
    }
  };

  return (
    <div className="pl-3 pt-3 rounded text-white max-w-[calc(95%)]">
      <div className="header flex justify-between max-w-[700px] max-h-[30px] border-b-2 pb-1" style={{ borderBottomColor: grey }}>
        <h2 className="font-bold text-blue-400">
          {type === 'instruction' ? 'Instructions:' : 'KondoAI message:'}
        </h2>
        <div className="button-container flex items-center gap-2">
          {type === 'response' && (
            <>
              {selectedBookmarkId && responseId && !reservedBookmarkTitles.includes(selectedBookmarkTitle) && (
                <div 
                className={"rank-container flex items-center gap-1 px-1 rounded-lg transition-colors duration-400]"}
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
              )}

              {!selectedBookmarkId && onQuote && (
                <>
                  <button 
                    onClick={() => onQuote(response)} 
                    className="text-blue-400 hover:text-blue-700 transition-colors duration-200"
                  >
                    <ArrowUturnRightIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => setIsBookmarkModalOpen(true)} className="text-white">
                    <PlusIcon className="h-5 w-5" />
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
      <div className="whitespace-pre-wrap overflow-x-auto">
        <div className="max-w-[calc(100vw-80px)]">
          <Markdown remarkPlugins={[remarkGfm]}>{cleanResponse}</Markdown>
        </div>
      </div>
      {isBookmarkModalOpen && (
        <BookmarksModal
          isOpen={isBookmarkModalOpen}
          onClose={() => setIsBookmarkModalOpen(false)}
          response={response}
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