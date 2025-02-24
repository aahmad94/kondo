'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, QueueListIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import CreateBookmarkModal from './CreateBookmarkModal';
import DeleteBookmarkModal from './DeleteBookmarkModal';
import { useRouter } from 'next/navigation';

interface Bookmark {
  id: string;
  title: string;
}

interface BookmarksProps {
  changeSelectedBookmark: (bookmarkId: string|null, bookmarkTitle: string|null) => void;
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string | null;
  reservedBookmarkTitles: string[];
  onRefetchBookmarks?: () => void;
  selectedLanguage: string;
}

export default function Bookmarks({ 
  changeSelectedBookmark, 
  selectedBookmarkId, 
  selectedBookmarkTitle, 
  reservedBookmarkTitles,
  onRefetchBookmarks,
  selectedLanguage
}: BookmarksProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const fetchBookmarks = async (userId: string) => {
    try {
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      const data = await response.json();
      setBookmarks(data);
      // Notify parent that bookmarks were refetched
      onRefetchBookmarks?.();
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  // Refetch bookmarks when language changes
  useEffect(() => {
    if (session?.userId) {
      fetchBookmarks(session.userId);
    }
  }, [session, selectedLanguage]);

  useEffect(() => {
    // Check if window width is less than 768px (mobile)
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // Only set isOpen to false on initial load or when resizing to mobile
        // Don't override if we're already in mobile view
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBookmarkInteraction = (bookmarkId: string, bookmarkTitle: string) => {
    // Update URL with new query parameters using the App Router pattern
    router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
    changeSelectedBookmark(bookmarkId, bookmarkTitle);
    
    // close bookmarks if on mobile
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
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
        if (selectedBookmarkId === bookmarkToDelete.id) {
          changeSelectedBookmark(null, null);
        }
        setIsDeleteModalOpen(false);
        setBookmarkToDelete(null);
      } catch (error) {
        console.error('Error deleting bookmark:', error);
      }
    }
  };

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed top-[56px] h-[50px] w-8 rounded-r-lg bg-gray-800/80 ml-0 flex items-center justify-center z-10">
          <button 
            onClick={handleToggleOpen}
            className="text-white w-full h-full flex items-center justify-center cursor-pointer"
          >
            <ChevronRightIcon className="h-6 w-6 text-blue-400" />
          </button>
        </div>
      )}
      
      <div className={`flex-none bg-gray-800 transition-[width] duration-300 ease-in-out ${isOpen ? 'w-48' : 'w-0'} h-[calc(100vh-50px)] overflow-hidden`}>
        <div className="w-48 h-full">
          {isOpen && (
            <>
              <div className="flex justify-between items-center pl-4 px-2 py-2">
                <h2 className="text-xl text-white">Bookmarks</h2>
                <button 
                  onClick={handleToggleOpen} 
                  className="text-white cursor-pointer"
                >
                  <ChevronLeftIcon className="h-6 w-6 text-blue-400" />
                </button>
              </div>

              <div className="flex flex-col p-2">
                <div
                  className="create-bookmark-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-lg transition-all pl-2 py-1 inline-block"
                  onClick={handleCreateNewBookmark}
                >
                  <PlusCircleIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">create bookmark</span>
                </div>

                <div 
                  className={`all-responses-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-lg transition-all pl-2 py-1 inline-block
                    ${selectedBookmarkId === "all" ? 'bg-gray-700 rounded-lg' : ''}`}
                  onClick={() => handleBookmarkInteraction("all", "all responses")}
                  onTouchStart={() => handleBookmarkInteraction("all", "all responses")}
                >
                  <QueueListIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">all responses</span>
                </div>

                <div 
                  className={`daily-summary-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-lg transition-all pl-2 py-1 inline-block
                    ${selectedBookmarkTitle === "daily summary" ? 'bg-gray-700 rounded-lg' : ''}`}
                  onClick={() => {
                    const dailySummaryBookmark = bookmarks.find(b => b.title === 'daily summary');
                    if (dailySummaryBookmark) {
                      handleBookmarkInteraction(dailySummaryBookmark.id, dailySummaryBookmark.title);
                    }
                  }}
                >
                  <DocumentTextIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">daily summary</span>
                </div>

                <div className="overflow-y-auto max-h-[50vh]">
                  {bookmarks
                    .filter(bookmark => !reservedBookmarkTitles.includes(bookmark.title))
                    .map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className={`mb-2 cursor-pointer hover:bg-gray-700 hover:rounded-lg transition-all pl-2 py-1 flex justify-between items-center group
                          ${selectedBookmarkId === bookmark.id ? 'bg-gray-700 rounded-lg' : ''}`}
                        onClick={() => handleBookmarkInteraction(bookmark.id, bookmark.title)}
                      >
                        <span className="text-white">
                          {bookmark.title}
                        </span>
                        <XCircleIcon
                          className="h-5 w-5 mr-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={(e) => handleDeleteClick(bookmark, e)}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBookmarkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onBookmarkCreated={handleBookmarkCreated}
          reservedBookmarkTitles={reservedBookmarkTitles}
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
    </>
  );
}
