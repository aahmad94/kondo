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
  deckTitle: string;
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
  onCommunityImport?: (communityResponseId: string, deckId?: string, createNew?: boolean) => Promise<void>;
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
  const [decks, setBookmarks] = useState<Bookmark[]>([]);
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
        throw new Error('Failed to fetch decks');
      }
      const data = await response.json();
      // Filter out reserved decks using the reservedBookmarkTitles array
      const nonReservedBookmarks = data.filter((deck: Bookmark) => 
        !reservedBookmarkTitles.includes(deck.title)
      ).sort((a: Bookmark, b: Bookmark) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setBookmarks(nonReservedBookmarks);
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToBookmark = async (deckId: string) => {
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
          deckId,
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

      // Find the deck title
      const deck = decks.find(b => b.id === deckId);
      if (deck) {
        // Update URL with new query parameters
        router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deck.title)}`);
        // Notify parent component of deck selection
        onBookmarkSelect?.(deckId, deck.title);
      }

      // Close the modal after successful addition
      onClose();
    } catch (error) {
      console.error('Error adding response to deck:', error);
    } finally {
      setIsAddingToBookmark(false);
    }
  };

  const handleCreateAndAddToBookmark = async (newBookmark: Bookmark) => {
    setBookmarks([...decks, newBookmark]);

    // call parent component callback function to update the decks.tsx list
    if (onBookmarkCreated) {
      onBookmarkCreated(newBookmark);
    }

    if (communityResponse && onCommunityImport) {
      // For community imports, use the community import handler
      await onCommunityImport(communityResponse.id, newBookmark.id);
      // Close the main BookmarksModal after successful community import
      onClose();
    } else if (!isAddingToBookmark) {
      // For regular responses, use the regular add handler
      await handleAddToBookmark(newBookmark.id);
      // handleAddToBookmark already calls onClose() internally
    }

    setIsCreateModalOpen(false);
    
    // For regular responses, notify parent component of deck selection for navigation
    // For community imports, don't navigate - just show success modal instead
    if (!communityResponse && onBookmarkSelect) {
      onBookmarkSelect(newBookmark.id, newBookmark.title);
    }
  };

  // Handler for community response imports
  const handleCommunityImport = async (deckId?: string, createNew?: boolean) => {
    if (!communityResponse || !onCommunityImport) return;

    try {
      setIsAddingToBookmark(true);
      await onCommunityImport(communityResponse.id, deckId, createNew);
      onClose();
    } catch (error) {
      console.error('Error importing community response:', error);
    } finally {
      setIsAddingToBookmark(false);
    }
  };

  // Check if user has a deck matching the community response title
  const existingCommunityBookmark = communityResponse 
    ? decks.find(deck => deck.title.toLowerCase() === communityResponse.deckTitle.toLowerCase())
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
            {/* Community response suggested deck option */}
            {communityResponse && (
              <div
                className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isAddingToBookmark && handleCommunityImport(existingCommunityBookmark?.id, !existingCommunityBookmark)}
              >
                <PlusCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>
                  {existingCommunityBookmark ? '' : 'create and '}
                  add to "{communityResponse.deckTitle}"
                </span>
              </div>
            )}
            
            {/* Regular new deck option */}
            <div
              className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToBookmark ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isAddingToBookmark && setIsCreateModalOpen(true)}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>create new deck</span>
            </div>
            
            <FilterableBookmarkList
              decks={decks}
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
