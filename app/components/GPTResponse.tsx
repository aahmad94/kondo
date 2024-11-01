import React, { useState } from 'react';
import { PlusIcon, XCircleIcon, ArrowUturnRightIcon } from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface GPTResponseProps {
  response: string;
  selectedBookmarkId: string | null;
  responseId?: string | null;
  onDelete?: (responseId: string) => Promise<void>;
  onQuote?: (response: string) => void;
}

export default function GPTResponse({ response, selectedBookmarkId, responseId, onDelete, onQuote }: GPTResponseProps) {
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cleanResponse = response
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace multiple empty lines with single empty line
    .replace(/\n-/g, '\n');  // Remove dash after newline

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
    <div className="mt-2 p-2 pl-4 rounded text-white max-w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-blue-400">KondoAI message:</h2>
        <div className="flex gap-2">
          {!selectedBookmarkId && onQuote && (
            <>
            <button 
              onClick={() => onQuote(response)} 
              className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
            >
              <ArrowUturnRightIcon className="h-6 w-6" />
            </button>

            <button onClick={() => setIsBookmarkModalOpen(true)} className="text-white">
              <PlusIcon className="h-6 w-6" />
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
        </div>
      </div>
      <div className="whitespace-pre-wrap overflow-x-auto">
        <div className="max-w-[calc(100vw-80px)]"> {/* 48px for bookmarks + 32px for padding */}
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
