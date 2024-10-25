import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface Bookmark {
  id: string;
  title: string;
}

interface BookmarksProps {
  onBookmarkSelect: (bookmarkId: string) => void;
}

export default function Bookmarks({ onBookmarkSelect }: BookmarksProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.userId) {
      fetchBookmarks(session.userId);
    }
  }, [session]);

  const fetchBookmarks = async (userId: string) => {
    try {
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      const data = await response.json();
      console.log({bookmarks: data});
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleBookmarkClick = (bookmarkId: string) => {
    onBookmarkSelect(bookmarkId);
  };

  return (
    <div className={`bg-gray-800 text-white transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className="flex justify-between items-center px-3 py-2">
        {isOpen && <h2 className="text-xl">Bookmarks</h2>}
        <button onClick={() => setIsOpen(!isOpen)} className="text-white">
          {isOpen ? (
            <ChevronLeftIcon className="h-6 w-6" />
          ) : (
            <ChevronRightIcon className="h-6 w-6" />
          )}
        </button>
      </div>
      {isOpen && (
        <ul className="list-disc list-inside p-2 pl-4">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="mb-2 cursor-pointer inline-block hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-lg transition-all px-2 py-1"
              onClick={() => handleBookmarkClick(bookmark.id)}
            >
              {bookmark.title}
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
