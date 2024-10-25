import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import BookmarksModal from './BookmarksModal';

interface GPTResponseProps {
  response: string;
  selectedBookmarkId: string | null;
}

export default function GPTResponse({ response, selectedBookmarkId }: GPTResponseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatResponse = (text: string) => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="mt-4 p-4 border rounded text-white">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-blue-400">AI Response:</h2>
        {!selectedBookmarkId && (
          <button onClick={() => setIsModalOpen(true)} className="text-white">
            <PlusIcon className="h-6 w-6" />
          </button>
        )}
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
