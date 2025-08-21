'use client';

import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface Bookmark {
  id: string;
  title: string;
  updatedAt?: string;
}

interface FilterableBookmarkListProps {
  bookmarks: Bookmark[];
  reservedBookmarkTitles: string[];
  variant: 'sidebar' | 'modal';
  onBookmarkSelect: (id: string, title: string) => void;
  selectedBookmarkId?: string;
  isLoading: boolean;
  isAddingToBookmark?: boolean;
  showBookmarkDropdown?: string | null;
  onChevronClick?: (bookmark: Bookmark, e: React.MouseEvent) => void;
  onChevronTouch?: (bookmark: Bookmark, e: React.TouchEvent) => void;
  onEditClick?: (bookmark: Bookmark, e: React.MouseEvent) => void;
  onDeleteClick?: (bookmark: Bookmark, e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => void;
  onTouchEnd?: (e: React.TouchEvent, bookmarkId: string, bookmarkTitle: string) => void;
}

export function FilterableBookmarkList({
  bookmarks,
  reservedBookmarkTitles,
  variant,
  onBookmarkSelect,
  selectedBookmarkId,
  isLoading,
  isAddingToBookmark = false,
  showBookmarkDropdown,
  onChevronClick,
  onChevronTouch,
  onEditClick,
  onDeleteClick,
  onTouchStart,
  onTouchEnd
}: FilterableBookmarkListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .filter(bookmark => !reservedBookmarkTitles.includes(bookmark.title))
      .filter(bookmark => 
        bookmark.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: Bookmark, b: Bookmark) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [bookmarks, reservedBookmarkTitles, searchTerm]);

  const handleBookmarkClick = (bookmark: Bookmark) => {
    if (isAddingToBookmark) return;
    onBookmarkSelect(bookmark.id, bookmark.title);
  };

  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col px-1">
        {/* Search Bar */}
        <div className="pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="filter bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Bookmark List */}
        <div className="overflow-y-auto bookmark-list max-h-[60vh] min-h-[200px] pb-16">
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
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 px-2">
              {searchTerm ? 'No bookmarks found' : 'No bookmarks yet'}
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className={`mb-2 cursor-pointer hover:bg-accent hover:rounded-sm transition-all pl-2 py-1 flex justify-between items-center group relative
                  ${selectedBookmarkId === bookmark.id ? 'bg-accent rounded-sm' : ''}`}
                onClick={() => handleBookmarkClick(bookmark)}
                onTouchStart={onTouchStart ? (e) => onTouchStart(e, bookmark.id, bookmark.title) : undefined}
                onTouchEnd={onTouchEnd ? (e) => onTouchEnd(e, bookmark.id, bookmark.title) : undefined}
              >
                <span className="text-card-foreground flex-1 truncate">
                  {bookmark.title}
                </span>
                {onChevronClick && (
                  <div className="relative">
                    <ChevronDownIcon
                      className={`bookmark-chevron-button h-5 w-5 mr-1 text-muted-foreground hover:text-card-foreground transition-colors duration-200
                        ${selectedBookmarkId === bookmark.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      onClick={(e) => onChevronClick(bookmark, e)}
                      onTouchEnd={onChevronTouch ? (e) => onChevronTouch(bookmark, e) : undefined}
                    />
                    {showBookmarkDropdown === bookmark.id && (
                      <div className="bookmark-dropdown-menu absolute right-0 top-full mt-1 rounded-md shadow-lg bg-popover ring-1 ring-border z-[60] min-w-[80px]">
                        <div className="py-1">
                          {onEditClick && (
                            <button
                              onClick={(e) => onEditClick(bookmark, e)}
                              className="flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
                            >
                              Edit
                            </button>
                          )}
                          {onDeleteClick && (
                            <button
                              onClick={(e) => onDeleteClick(bookmark, e)}
                              className="flex items-center w-full px-3 py-1.5 text-xs text-left text-destructive hover:bg-accent whitespace-nowrap"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Modal variant
  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="relative px-1">
        <input
          type="text"
          placeholder="filter bookmarks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Bookmark List */}
      <ul className="space-y-2 overflow-y-auto max-h-[40vh] min-h-[150px] pb-4">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 7 }).map((_, index) => (
            <li
              key={index}
              className="p-2"
            >
              <div className="h-6 bg-muted rounded-sm animate-pulse-fast"></div>
            </li>
          ))
        ) : filteredBookmarks.length === 0 ? (
          <li className="text-center text-muted-foreground py-4">
            {searchTerm ? 'No bookmarks found' : 'No bookmarks yet'}
          </li>
        ) : (
          filteredBookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className={`cursor-pointer text-card-foreground hover:bg-accent p-2 rounded-sm ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleBookmarkClick(bookmark)}
            >
              {bookmark.title}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
