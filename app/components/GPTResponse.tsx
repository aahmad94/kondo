import React, { useState } from 'react';
import { PlusIcon, XCircleIcon } from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';

interface GPTResponseProps {
  response: string;
  selectedBookmarkId: string | null;
  responseId?: string | null;
  onDelete: (responseId: string) => Promise<void>;
}

export default function GPTResponse({ response, selectedBookmarkId, responseId, onDelete }: GPTResponseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!selectedBookmarkId || !responseId || isDeleting) return;

    try {
      setIsDeleting(true);
      await onDelete(responseId);
    } catch (error) {
      console.error('Error deleting response:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatResponse = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="mt-4 p-4 rounded text-white">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-blue-400">KondoAI message:</h2>
        <div className="flex gap-2">
          {!selectedBookmarkId && (
            <button onClick={() => setIsModalOpen(true)} className="text-white">
              <PlusIcon className="h-6 w-6" />
            </button>
          )}
          {selectedBookmarkId && responseId && (
            <button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors duration-200"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
      <div className="whitespace-pre-wrap">{formatResponse(response)}</div>
      {isModalOpen && (
        <BookmarksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          response={response}
        />
      )}
    </div>
  );
}
