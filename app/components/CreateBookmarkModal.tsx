import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkCreated: (newBookmark: { id: string; title: string }) => void;
}

export default function CreateBookmarkModal({ isOpen, onClose, onBookmarkCreated }: CreateBookmarkModalProps) {
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const { data: session } = useSession();

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !bookmarkTitle.trim()) return;

    try {
      const response = await fetch('/api/createBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: bookmarkTitle,
          userId: session.userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create bookmark');
      }

      const newBookmark = await response.json();
      onBookmarkCreated(newBookmark);
      setBookmarkTitle('');
    } catch (error) {
      console.error('Error creating bookmark:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l text-white">Create New Bookmark</h2>
          <button onClick={onClose} className="text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleCreateBookmark}>
          <input
            type="text"
            value={bookmarkTitle}
            onChange={(e) => setBookmarkTitle(e.target.value)}
            placeholder="Enter bookmark name"
            className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Create Bookmark
          </button>
        </form>
      </div>
    </div>
  );
}
