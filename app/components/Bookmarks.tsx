'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, QueueListIcon, XCircleIcon, DocumentTextIcon, MagnifyingGlassIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import CreateBookmarkModal from './CreateBookmarkModal';
import DeleteBookmarkModal from './DeleteBookmarkModal';
import { useRouter } from 'next/navigation';
import { trackBookmarkSelect, trackClearBookmark, trackCreateBookmark } from '../../lib/amplitudeService';

interface Bookmark {
  id: string;
  title: string;
}

interface BookmarksProps {
  changeSelectedBookmark: (bookmarkId: string|null, bookmarkTitle: string|null) => void;
  selectedBookmark: { id: string | null, title: string | null };
  reservedBookmarkTitles: string[];
  selectedLanguage: string;
  onClearBookmark: () => void;
}

export default function Bookmarks({ 
  changeSelectedBookmark, 
  selectedBookmark, 
  reservedBookmarkTitles,
  selectedLanguage,
  onClearBookmark
}: BookmarksProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);

  const fetchBookmarks = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      const data = await response.json();
      setBookmarks(data);

      // If no bookmarks exist, create default ones
      if (data.length === 0) {
        await createDefaultBookmarks(userId);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultBookmarks = async (userId: string) => {
    const defaultBookmarks = ['counting', 'verbs', 'introductions'];
    
    try {
      for (const title of defaultBookmarks) {
        const response = await fetch('/api/createBookmark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create default bookmark: ${title}`);
        }

        const newBookmark = await response.json();
        // Track bookmark creation
        await trackCreateBookmark(newBookmark.id, newBookmark.title);
      }

      // After creating all default bookmarks, refetch the complete list
      await fetchBookmarks(userId);
    } catch (error) {
      console.error('Error creating default bookmarks:', error);
    }
  };

  // Refetch bookmarks when language changes
  useEffect(() => {
    setBookmarks([]);
    if (session?.userId) {
      fetchBookmarks(session.userId);
    }
  }, [selectedLanguage]);

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

  const handleBookmarkInteraction = async (bookmarkId: string, bookmarkTitle: string) => {
    console.log('****handleBookmarkInteraction****', { bookmarkId, bookmarkTitle });
    // Track bookmark selection
    await trackBookmarkSelect(bookmarkId, bookmarkTitle);
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

  const handleBookmarkCreated = async (newBookmark: Bookmark) => {
    setBookmarks([...bookmarks, newBookmark]);
    setIsCreateModalOpen(false);
    // Track bookmark creation
    await trackCreateBookmark(newBookmark.id, newBookmark.title);
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
        if (selectedBookmark.id === bookmarkToDelete.id) {
          changeSelectedBookmark(null, null);
          // Track bookmark clearing
          await trackClearBookmark();
        }
        setIsDeleteModalOpen(false);
        setBookmarkToDelete(null);
      } catch (error) {
        console.error('Error deleting bookmark:', error);
      }
    }
  };

  const handleChatClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
    onClearBookmark();
    // Track bookmark clearing when clicking chat
    await trackClearBookmark();
  };

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleTouchStart = (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => {
    if (!touchStartY.current || !touchStartTime.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const deltaY = Math.abs(touchEndY - touchStartY.current);
    const deltaTime = touchEndTime - touchStartTime.current;

    // If it's a quick tap (less than 200ms) and minimal movement (less than 10px)
    if (deltaTime < 200 && deltaY < 10) {
      handleBookmarkInteraction(bookmarkId, bookmarkTitle);
    }

    // Reset touch tracking
    touchStartY.current = null;
    touchStartTime.current = null;
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
                  className="chat-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-sm transition-all pl-2 py-1 inline-block"
                  onClick={handleChatClick}
                >
                  <ChatBubbleLeftIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">KondoAI</span>
                </div>

                <div
                  className="create-bookmark-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-sm transition-all pl-2 py-1 inline-block"
                  onClick={handleCreateNewBookmark}
                >
                  <PlusCircleIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">new bookmark</span>
                </div>

                <div 
                  className={`search-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-sm transition-all pl-2 py-1 inline-block
                    ${selectedBookmark.title === "search" ? 'bg-gray-700 rounded-sm' : ''}`}
                  onClick={() => handleBookmarkInteraction("search", "search")}
                  onTouchStart={() => handleBookmarkInteraction("search", "search")}
                >
                  <MagnifyingGlassIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">search</span>
                </div>

                <div 
                  className={`all-responses-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-sm transition-all pl-2 py-1 inline-block
                    ${selectedBookmark.id === "all" ? 'bg-gray-700 rounded-sm' : ''}`}
                  onClick={() => handleBookmarkInteraction("all", "all responses")}
                  onTouchStart={() => handleBookmarkInteraction("all", "all responses")}
                >
                  <QueueListIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                  <span className="text-blue-400">all responses</span>
                </div>

                <div 
                  className={`daily-summary-button mb-2 cursor-pointer hover:bg-gray-500 hover:bg-opacity-50 hover:rounded-sm transition-all pl-2 py-1 inline-block
                    ${selectedBookmark.title === "daily summary" ? 'bg-gray-700 rounded-sm' : ''}`}
                  onClick={() => {
                    const dailySummaryBookmark = bookmarks.find(b => b.title === 'daily summary');
                    if (dailySummaryBookmark) {
                      handleBookmarkInteraction(dailySummaryBookmark.id, dailySummaryBookmark.title);
                    }
                  }}
                >
                  <DocumentTextIcon className="h-4 w-4 inline mr-2" style={{ color: '#b59f3b' }}/>
                  <span style={{ color: '#b59f3b' }}>dojo</span>
                </div>

                <div className="overflow-y-auto max-h-[50vh] bookmark-list">
                  {isLoading ? (
                    // Skeleton loading state
                    Array.from({ length: 10 }).map((_, index) => (
                      <div
                        key={index}
                        className="mb-2 pl-2 py-1 flex justify-between items-center"
                      >
                        <div className="h-5 w-3/4 bg-gray-700 rounded-sm animate-pulse-fast"></div>
                      </div>
                    ))
                  ) : (
                    bookmarks
                      .filter(bookmark => !reservedBookmarkTitles.includes(bookmark.title))
                      .map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className={`mb-2 cursor-pointer hover:bg-gray-700 hover:rounded-sm transition-all pl-2 py-1 flex justify-between items-center group
                            ${selectedBookmark.id === bookmark.id ? 'bg-gray-700 rounded-sm' : ''}`}
                          onClick={() => handleBookmarkInteraction(bookmark.id, bookmark.title)}
                          onTouchStart={(e) => handleTouchStart(e, bookmark.id, bookmark.title)}
                          onTouchEnd={(e) => handleTouchEnd(e, bookmark.id, bookmark.title)}
                        >
                          <span className="text-white">
                            {bookmark.title}
                          </span>
                          <XCircleIcon
                            className={`h-5 w-5 mr-1 text-red-500 hover:text-red-700 transition-colors duration-200
                              ${selectedBookmark.id === bookmark.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => handleDeleteClick(bookmark, e)}
                          />
                        </div>
                      ))
                  )}
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
