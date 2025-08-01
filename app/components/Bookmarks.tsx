'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, QueueListIcon, XCircleIcon, DocumentTextIcon, MagnifyingGlassIcon, ChatBubbleLeftIcon, AcademicCapIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import CreateBookmarkModal from './CreateBookmarkModal';
import DeleteBookmarkModal from './DeleteBookmarkModal';
import EditBookmarkModal from './EditBookmarkModal';
import { useRouter } from 'next/navigation';
import { trackBookmarkSelect, trackClearBookmark, trackCreateBookmark } from '../../lib/amplitudeService';
import { useIsMobile } from '../hooks/useIsMobile';

interface Bookmark {
  id: string;
  title: string;
  updatedAt?: string;
}

interface BookmarksProps {
  changeSelectedBookmark: (bookmarkId: string|null, bookmarkTitle: string|null) => void;
  selectedBookmark: { id: string | null, title: string | null };
  reservedBookmarkTitles: string[];
  selectedLanguage: string;
  onClearBookmark: () => void;
  newBookmark: { id: string, title: string } | null;
}

export default function Bookmarks({ 
  changeSelectedBookmark, 
  selectedBookmark, 
  reservedBookmarkTitles,
  selectedLanguage,
  onClearBookmark,
  newBookmark
}: BookmarksProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookmarkToEdit, setBookmarkToEdit] = useState<Bookmark | null>(null);
  const [showBookmarkDropdown, setShowBookmarkDropdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const bookmarkDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the clicked element is within any dropdown menu
      const target = event.target as HTMLElement;
      const isWithinDropdown = target.closest('.bookmark-dropdown-menu');
      const isChevronButton = target.closest('.bookmark-chevron-button');
      
      if (!isWithinDropdown && !isChevronButton) {
        setShowBookmarkDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        // remove this once we have a way to create default bookmarks
        // await createDefaultBookmarks(userId);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultBookmarks = async (userId: string) => {
    const defaultBookmarks = ['counting', 'alphabet', 'verbs', 'introductions', 'daily summary'];
    
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
  }, [selectedLanguage, newBookmark]);

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
    setShowBookmarkDropdown(null);
  };

  const handleEditClick = (bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkToEdit(bookmark);
    setIsEditModalOpen(true);
    setShowBookmarkDropdown(null);
  };

  const handleBookmarkUpdated = (updatedBookmark: Bookmark) => {
    setBookmarks(bookmarks.map(b => 
      b.id === updatedBookmark.id ? updatedBookmark : b
    ));
    setIsEditModalOpen(false);
    setBookmarkToEdit(null);
    
    // If the updated bookmark is currently selected, update the selected bookmark title
    if (selectedBookmark.id === updatedBookmark.id) {
      changeSelectedBookmark(updatedBookmark.id, updatedBookmark.title);
    }
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
    changeSelectedBookmark(null, null); // This sets the chat as "selected" state
    onClearBookmark();
    // Track bookmark clearing when clicking chat
    await trackClearBookmark();
  };

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleChevronClick = (bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBookmarkDropdown(showBookmarkDropdown === bookmark.id ? null : bookmark.id);
  };

  const handleChevronTouch = (bookmark: Bookmark, e: React.TouchEvent) => {
    e.stopPropagation();
    setShowBookmarkDropdown(showBookmarkDropdown === bookmark.id ? null : bookmark.id);
  };

  const handleTouchStart = (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => {
    // Check if the touch target is the chevron or within the chevron area
    const target = e.target as HTMLElement;
    const chevronElement = target.closest('.bookmark-chevron-button');
    
    if (chevronElement) {
      // If touching the chevron, don't start the bookmark selection touch tracking
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => {
    // Check if the touch target is the chevron or within the chevron area
    const target = e.target as HTMLElement;
    const chevronElement = target.closest('.bookmark-chevron-button');
    
    if (chevronElement) {
      // If touching the chevron, don't handle bookmark selection
      return;
    }

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
        <div className="fixed top-[56px] h-[50px] w-8 rounded-r-lg bg-card/80 border border-border ml-0 flex items-center justify-center z-10">
          <button 
            onClick={handleToggleOpen}
            className="text-card-foreground w-full h-full flex items-center justify-center cursor-pointer"
          >
            <ChevronRightIcon className="h-6 w-6 text-blue-400" />
          </button>
        </div>
      )}
      
      <div className={`flex-none bg-card border-r border-border transition-[width] duration-300 ease-in-out ${isOpen ? 'w-52' : 'w-0'} h-[calc(100vh-50px)] overflow-hidden`}>
        <div className="w-52 h-full" style={{ willChange: 'auto', backfaceVisibility: 'hidden' }}>
          {isOpen && (
            <>
              <div className="flex justify-between items-start px-2 py-2">
                <div className="flex flex-col space-y-1">
                  <div 
                    className={`daily-summary-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedBookmark.title === "daily summary" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={() => {
                      const dailySummaryBookmark = bookmarks.find(b => b.title === 'daily summary');
                      if (dailySummaryBookmark) {
                        handleBookmarkInteraction(dailySummaryBookmark.id, dailySummaryBookmark.title);
                      }
                    }}
                  >
                    <AcademicCapIcon className="h-4 w-4 inline mr-2 text-phrase-text"/>
                    <span className="text-phrase-text">dojo</span>
                  </div>

                  <div
                    className={`chat-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedBookmark.id === null && selectedBookmark.title === null ? 'bg-accent rounded-sm' : ''}`}
                    onClick={handleChatClick}
                  >
                    <ChatBubbleLeftIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">chat</span>
                  </div>

                  <div 
                    className={`search-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedBookmark.title === "search" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={() => handleBookmarkInteraction("search", "search")}
                    onTouchStart={() => handleBookmarkInteraction("search", "search")}
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">search</span>
                  </div>

                  <div 
                    className={`all-responses-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedBookmark.id === "all" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={() => handleBookmarkInteraction("all", "all responses")}
                    onTouchStart={() => handleBookmarkInteraction("all", "all responses")}
                  >
                    <QueueListIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">all responses</span>
                  </div>

                  <div
                    className="create-bookmark-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block"
                    onClick={handleCreateNewBookmark}
                  >
                    <PlusCircleIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">new bookmark</span>
                  </div>
                </div>

                <button 
                  onClick={handleToggleOpen} 
                  className="text-card-foreground cursor-pointer"
                >
                  <ChevronLeftIcon className="h-6 w-6 text-blue-400" />
                </button>
              </div>

              <div className="flex flex-col p-2">

                <div className={`overflow-y-auto bookmark-list ${isMobile ? 'max-h-[55vh]' : 'max-h-[70vh]'}`}>
                  {isLoading ? (
                    // Skeleton loading state
                    Array.from({ length: 10 }).map((_, index) => (
                      <div
                        key={index}
                        className="mb-2 pl-2 py-1 flex justify-between items-center"
                      >
                        <div className="h-5 w-3/4 bg-muted rounded-sm animate-pulse-fast"></div>
                      </div>
                    ))
                  ) : (
                    bookmarks
                      .filter(bookmark => !reservedBookmarkTitles.includes(bookmark.title))
                      .sort((a: Bookmark, b: Bookmark) => {
                        if (!a.updatedAt) return 1;
                        if (!b.updatedAt) return -1;
                        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                      })
                      .map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className={`mb-2 cursor-pointer hover:bg-accent hover:rounded-sm transition-all pl-2 py-1 flex justify-between items-center group relative
                            ${selectedBookmark.id === bookmark.id ? 'bg-accent rounded-sm' : ''}`}
                          onClick={() => handleBookmarkInteraction(bookmark.id, bookmark.title)}
                          onTouchStart={(e) => handleTouchStart(e, bookmark.id, bookmark.title)}
                          onTouchEnd={(e) => handleTouchEnd(e, bookmark.id, bookmark.title)}
                        >
                          <span className="text-card-foreground flex-1 truncate">
                            {bookmark.title}
                          </span>
                          <div className="relative">
                            <ChevronDownIcon
                              className={`bookmark-chevron-button h-5 w-5 mr-1 text-muted-foreground hover:text-card-foreground transition-colors duration-200
                                ${selectedBookmark.id === bookmark.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              onClick={(e) => handleChevronClick(bookmark, e)}
                              onTouchEnd={(e) => handleChevronTouch(bookmark, e)}
                            />
                            {showBookmarkDropdown === bookmark.id && (
                              <div className="bookmark-dropdown-menu absolute right-0 top-full mt-1 rounded-md shadow-lg bg-popover ring-1 ring-border z-[60] min-w-[80px]">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => handleEditClick(bookmark, e)}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteClick(bookmark, e)}
                                    className="flex items-center w-full px-3 py-1.5 text-xs text-left text-destructive hover:bg-accent whitespace-nowrap"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
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
      {isEditModalOpen && bookmarkToEdit && (
        <EditBookmarkModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onBookmarkUpdated={handleBookmarkUpdated}
          bookmark={bookmarkToEdit}
          reservedBookmarkTitles={reservedBookmarkTitles}
        />
      )}
    </>
  );
}
