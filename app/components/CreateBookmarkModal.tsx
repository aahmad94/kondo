import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkCreated: (newBookmark: { id: string; title: string }) => void;
  reservedBookmarkTitles: string[];
}

export default function CreateBookmarkModal({ isOpen, onClose, onBookmarkCreated, reservedBookmarkTitles }: CreateBookmarkModalProps) {
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !bookmarkTitle.trim()) return;

    setError(null); // Reset error state

    if (reservedBookmarkTitles.includes(bookmarkTitle)) {
      setError('This bookmark title is reserved.');
      return;
    }

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

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      onBookmarkCreated(data);
      setBookmarkTitle('');
      onClose();
    } catch (error) {
      console.error('Error creating bookmark:', error);
      setError('Failed to create bookmark. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto">
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
            className="w-full p-2 mb-4 bg-gray-700 text-white rounded-sm"
          />
          {error && (
            <div className="text-red-500 mb-4 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600"
          >
            Create Bookmark
          </button>
        </form>
      </div>
    </div>
  );
}
