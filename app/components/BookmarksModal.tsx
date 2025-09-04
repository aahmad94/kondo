import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import CreateBookmarkModal from './CreateBookmarkModal';
import { useRouter } from 'next/navigation';
import { FilterableBookmarkList } from './FilterableBookmarkList';

interface Bookmark {
  id: string;
  title: string;
  updatedAt?: string;
}

interface CommunityResponseForImport {
  id: string;
  bookmarkTitle: string;
  content: string;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  furigana?: string | null;
  audio?: string | null;
  audioMimeType?: string | null;
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
  // Community import props
  communityResponse?: CommunityResponseForImport;
  onCommunityImport?: (communityResponseId: string, bookmarkId?: string, createNew?: boolean) => Promise<void>;
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
  onBookmarkSelect,
  communityResponse,
  onCommunityImport
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

    if (communityResponse && onCommunityImport) {
      // For community imports, use the community import handler
      await onCommunityImport(communityResponse.id, newBookmark.id);
    } else if (!isAddingToBookmark) {
      // For regular responses, use the regular add handler
      await handleAddToBookmark(newBookmark.id);
    }

    setIsCreateModalOpen(false);
    
    // Notify parent component of bookmark selection
    onBookmarkSelect?.(newBookmark.id, newBookmark.title);
  };

  // Handler for community response imports
  const handleCommunityImport = async (bookmarkId?: string, createNew?: boolean) => {
    if (!communityResponse || !onCommunityImport) return;

    try {
      setIsAddingToBookmark(true);
      await onCommunityImport(communityResponse.id, bookmarkId, createNew);
      onClose();
    } catch (error) {
      console.error('Error importing community response:', error);
    } finally {
      setIsAddingToBookmark(false);
    }
  };

  // Check if user has a bookmark matching the community response title
  const existingCommunityBookmark = communityResponse 
    ? bookmarks.find(bookmark => bookmark.title.toLowerCase() === communityResponse.bookmarkTitle.toLowerCase())
    : null;

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
          <div className="space-y-2 overflow-y-auto">
            {/* Community response suggested bookmark option */}
            {communityResponse && (
              <div
                className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center border border-primary/20 bg-primary/5 ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isAddingToBookmark && handleCommunityImport(existingCommunityBookmark?.id, !existingCommunityBookmark)}
              >
                <PlusCircleIcon className="h-4 w-4 mr-2" />
                <span>
                  add to "{communityResponse.bookmarkTitle}"
                  {existingCommunityBookmark ? '' : ' (will create)'}
                </span>
              </div>
            )}
            
            {/* Regular new bookmark option */}
            <div
              className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isAddingToBookmark && (communityResponse ? handleCommunityImport(undefined, true) : setIsCreateModalOpen(true))}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              <span>new bookmark</span>
            </div>
            
            <FilterableBookmarkList
              bookmarks={bookmarks}
              reservedBookmarkTitles={reservedBookmarkTitles}
              variant="modal"
              onBookmarkSelect={(id, title) => communityResponse ? handleCommunityImport(id) : handleAddToBookmark(id)}
              isLoading={isLoading}
              isAddingToBookmark={isAddingToBookmark}
            />
          </div>
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
