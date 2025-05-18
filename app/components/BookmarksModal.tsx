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
  reservedBookmarkTitles: string[];
}

export default function BookmarksModal({ isOpen, onClose, response, reservedBookmarkTitles }: BookmarksModalProps) {
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
      // Filter out reserved bookmarks using the reservedBookmarkTitles array
      const nonReservedBookmarks = data.filter((bookmark: Bookmark) => 
        !reservedBookmarkTitles.includes(bookmark.title)
      );
      setBookmarks(nonReservedBookmarks);
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
      <div className="bg-gray-800 p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] flex flex-col">
        <div className="flex justify-between items-center sticky top-0 bg-gray-800 pb-4">
          <h2 className="text-l text-white">Add to Bookmark</h2>
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto">
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="cursor-pointer text-white hover:bg-gray-700 p-2 rounded-sm"
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
