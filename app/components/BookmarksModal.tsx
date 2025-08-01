import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import CreateBookmarkModal from './CreateBookmarkModal';
import { useRouter } from 'next/navigation';

interface Bookmark {
  id: string;
  title: string;
  updatedAt?: string;
}

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: string;
  reservedBookmarkTitles: string[];
  cachedAudio?: { audio: string; mimeType: string } | null;
  desktopBreakdownContent?: string | null;
  mobileBreakdownContent?: string | null;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  onBookmarkCreated?: (newBookmark: { id: string, title: string }) => void;
  onBookmarkSelect?: (id: string | null, title: string | null) => void;
}

export default function BookmarksModal({ 
  isOpen, 
  onClose, 
  response, 
  reservedBookmarkTitles,
  cachedAudio,
  desktopBreakdownContent,
  mobileBreakdownContent,
  furigana,
  isFuriganaEnabled,
  isPhoneticEnabled,
  isKanaEnabled,
  onBookmarkCreated,
  onBookmarkSelect
}: BookmarksModalProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToBookmark, setIsAddingToBookmark] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isOpen && session?.userId) {
      fetchBookmarks(session.userId);
    }
  }, [isOpen, session]);

  const fetchBookmarks = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      const data = await response.json();
      // Filter out reserved bookmarks using the reservedBookmarkTitles array
      const nonReservedBookmarks = data.filter((bookmark: Bookmark) => 
        !reservedBookmarkTitles.includes(bookmark.title)
      ).sort((a: Bookmark, b: Bookmark) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setBookmarks(nonReservedBookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToBookmark = async (bookmarkId: string) => {
    if (!session?.userId || isAddingToBookmark) {
      return;
    }

    try {
      setIsAddingToBookmark(true);
      const res = await fetch('/api/addResponseToBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarkId,
          gptResponseContent: response,
          userId: session.userId,
          cachedAudio,
          desktopBreakdownContent,
          mobileBreakdownContent,
          furigana,
          isFuriganaEnabled,
          isPhoneticEnabled,
          isKanaEnabled
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Find the bookmark title
      const bookmark = bookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        // Update URL with new query parameters
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmark.title)}`);
        // Notify parent component of bookmark selection
        onBookmarkSelect?.(bookmarkId, bookmark.title);
      }

      // Close the modal after successful addition
      onClose();
    } catch (error) {
      console.error('Error adding response to bookmark:', error);
    } finally {
      setIsAddingToBookmark(false);
    }
  };

  const handleCreateAndAddToBookmark = async (newBookmark: Bookmark) => {
    setBookmarks([...bookmarks, newBookmark]);

    // call parent component callback function to update the bookmarks.tsx list
    if (onBookmarkCreated) {
      onBookmarkCreated(newBookmark);
    }

    if (!isAddingToBookmark) {
      await handleAddToBookmark(newBookmark.id);
    }

    setIsCreateModalOpen(false);
    
    // Notify parent component of bookmark selection
    onBookmarkSelect?.(newBookmark.id, newBookmark.title);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] flex flex-col">
          <div className="flex justify-between items-center sticky top-0 bg-card pb-4">
            <h2 className="text-l text-card-foreground">Add to Bookmark</h2>
            <button 
              onClick={onClose} 
              className="text-card-foreground hover:text-muted-foreground transition-colors duration-200"
              disabled={isAddingToBookmark}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <ul className="space-y-2 overflow-y-auto">
            <li
              className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isAddingToBookmark && setIsCreateModalOpen(true)}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              <span>new bookmark</span>
            </li>
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
            ) : (
              bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className={`cursor-pointer text-card-foreground hover:bg-accent p-2 rounded-sm ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isAddingToBookmark && handleAddToBookmark(bookmark.id)}
                >
                  {bookmark.title}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateBookmarkModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onBookmarkCreated={handleCreateAndAddToBookmark}
          reservedBookmarkTitles={reservedBookmarkTitles}
          optionalCopy='Add to New Bookmark'
        />
      )}
    </>
  );
}
