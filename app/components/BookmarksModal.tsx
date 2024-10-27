import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';

interface Bookmark {
  id: string;
  title: string;
}

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: string;
}

export default function BookmarksModal({ isOpen, onClose, response }: BookmarksModalProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    if (isOpen && session?.userId) {
      fetchBookmarks(session.userId);
    }
  }, [isOpen, session]);

  const fetchBookmarks = async (userId: string) => {
    try {
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      const data = await response.json();
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleAddToBookmark = async (bookmarkId: string) => {
    if (!session?.userId) {
      console.error('User not authenticated');
      return;
    }

    try {
      const res = await fetch('/api/addResponseToBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarkId,
          gptResponseContent: response,
          userId: session.userId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Close the modal after successful addition
      onClose();
    } catch (error) {
      console.error('Error adding response to bookmark:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white">Add to Bookmark</h2>
          <button onClick={onClose} className="text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <ul className="space-y-2">
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="cursor-pointer text-white hover:bg-gray-700 p-2 rounded"
              onClick={() => handleAddToBookmark(bookmark.id)}
            >
              {bookmark.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
