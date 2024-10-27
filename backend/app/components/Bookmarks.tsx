import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import CreateBookmarkModal from './CreateBookmarkModal';
import DeleteBookmarkModal from './DeleteBookmarkModal';

interface Bookmark {
  id: string;
  title: string;
}

interface BookmarksProps {
  onBookmarkSelect: (bookmarkId: string) => void;
}

export default function Bookmarks({ onBookmarkSelect }: BookmarksProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
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
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleBookmarkClick = (bookmarkId: string) => {
    onBookmarkSelect(bookmarkId);
  };

  const handleCreateNewBookmark = () => {
    setIsCreateModalOpen(true);
  };

  const handleBookmarkCreated = (newBookmark: Bookmark) => {
    setBookmarks([...bookmarks, newBookmark]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteClick = (bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkToDelete(bookmark);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (bookmarkToDelete && session?.userId) {
      try {
        const response = await fetch('/api/deleteBookmark', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.userId,
            bookmarkId: bookmarkToDelete.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete bookmark');
        }

        setBookmarks(bookmarks.filter(b => b.id !== bookmarkToDelete.id));
        setIsDeleteModalOpen(false);
        setBookmarkToDelete(null);
      } catch (error) {
        console.error('Error deleting bookmark:', error);
      }
    }
  };

  return (
    <div className={`bg-gray-800 text-white transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className="flex justify-between items-center pl-4 px-2 py-2">
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
        <div className="flex flex-col p-2">
          <div
            className="mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-lg transition-all pl-2 py-1 inline-block"
            onClick={handleCreateNewBookmark}
          >
            <PlusCircleIcon className="h-4 w-4 inline mr-2"/>
            <span>create bookmark</span>
          </div>
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="mb-2 cursor-pointer hover:bg-gray-700 hover:rounded-lg transition-all pl-2 py-1 flex justify-between items-center group"
              onClick={() => handleBookmarkClick(bookmark.id)}
            >
              <span>{bookmark.title}</span>
              <XCircleIcon
                className="h-5 w-5 mr-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => handleDeleteClick(bookmark, e)}
              />
            </div>
          ))}
        </div>
      )}
      {isCreateModalOpen && (
        <CreateBookmarkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onBookmarkCreated={handleBookmarkCreated}
        />
      )}
      {isDeleteModalOpen && bookmarkToDelete && (
        <DeleteBookmarkModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          bookmarkTitle={bookmarkToDelete.title}
        />
      )}
    </div>
  );
}
