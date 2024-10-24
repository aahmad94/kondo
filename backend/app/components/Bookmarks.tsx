import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface Bookmark {
  id: string;
  title: string;
}

export default function Bookmarks() {
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
    // TODO: Implement bookmark click logic
  };

  return (
    <div className={`bg-gray-800 text-white transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className="flex justify-between items-center p-2">
        {isOpen && <h2 className="text-xl font-bold">Bookmarks</h2>}
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
              className="mb-2 cursor-pointer"
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
