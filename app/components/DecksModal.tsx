import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import CreateDeckModal from './CreateDeckModal';
import { useRouter } from 'next/navigation';
import { FilterableDeckList } from './FilterableDeckList';

interface Deck {
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

interface DecksModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: string;
  reservedDeckTitles: string[];
  cachedAudio?: { audio: string; mimeType: string } | null;
  desktopBreakdownContent?: string | null;
  mobileBreakdownContent?: string | null;
  furigana?: string | null;
  isFuriganaEnabled?: boolean;
  isPhoneticEnabled?: boolean;
  isKanaEnabled?: boolean;
  onDeckCreated?: (newDeck: { id: string, title: string }) => void;
  onDeckSelect?: (id: string | null, title: string | null) => void;
  // Community import props
  communityResponse?: CommunityResponseForImport;
  onCommunityImport?: (communityResponseId: string, deckId?: string, createNew?: boolean) => Promise<void>;
  onDecksRefresh?: () => void;
}

export default function DecksModal({ 
  isOpen, 
  onClose, 
  response, 
  reservedDeckTitles,
  cachedAudio,
  desktopBreakdownContent,
  mobileBreakdownContent,
  furigana,
  isFuriganaEnabled,
  isPhoneticEnabled,
  isKanaEnabled,
  onDeckCreated,
  onDeckSelect,
  communityResponse,
  onCommunityImport,
  onDecksRefresh
}: DecksModalProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToDeck, setIsAddingToDeck] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isOpen && session?.userId) {
      fetchDecks(session.userId);
    }
  }, [isOpen, session]);

  const fetchDecks = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch decks');
      }
      const data = await response.json();
      // Filter out reserved decks using the reservedDeckTitles array
      const nonReservedDecks = data.filter((deck: Deck) => 
        !reservedDeckTitles.includes(deck.title)
      ).sort((a: Deck, b: Deck) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setDecks(nonReservedDecks);
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToDeck = async (deckId: string) => {
    if (!session?.userId || isAddingToDeck) {
      return;
    }

    try {
      setIsAddingToDeck(true);
      const res = await fetch('/api/addResponseToBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarkId: deckId,
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
        onDeckSelect?.(deckId, deck.title);
      }

      // Refresh the decks sidebar to show updated timestamps
      if (onDecksRefresh) {
        onDecksRefresh();
      }

      // Close the modal after successful addition
      onClose();
    } catch (error) {
      console.error('Error adding response to deck:', error);
    } finally {
      setIsAddingToDeck(false);
    }
  };

  const handleCreateAndAddToDeck = async (newDeck: Deck) => {
    setDecks([...decks, newDeck]);

    // call parent component callback function to update the decks.tsx list
    if (onDeckCreated) {
      onDeckCreated(newDeck);
    }

    if (communityResponse && onCommunityImport) {
      // For community imports, use the community import handler
      await onCommunityImport(communityResponse.id, newDeck.id);
      // Close the main DecksModal after successful community import
      onClose();
    } else if (!isAddingToDeck) {
      // For regular responses, use the regular add handler
      await handleAddToDeck(newDeck.id);
      // handleAddToDeck already calls onClose() internally
    }

    setIsCreateModalOpen(false);
    
    // For regular responses, notify parent component of deck selection for navigation
    // For community imports, don't navigate - just show success modal instead
    if (!communityResponse && onDeckSelect) {
      onDeckSelect(newDeck.id, newDeck.title);
    }
  };

  // Handler for community response imports
  const handleCommunityImport = async (deckId?: string, createNew?: boolean) => {
    if (!communityResponse || !onCommunityImport) return;

    try {
      setIsAddingToDeck(true);
      await onCommunityImport(communityResponse.id, deckId, createNew);
      onClose();
    } catch (error) {
      console.error('Error importing community response:', error);
    } finally {
      setIsAddingToDeck(false);
    }
  };

  // Check if user has a deck matching the community response title
  const existingCommunityDeck = communityResponse 
    ? decks.find(deck => deck.title.toLowerCase() === communityResponse.deckTitle.toLowerCase())
    : null;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] flex flex-col">
          <div className="flex justify-between items-center sticky top-0 bg-card pb-4">
            <h2 className="text-l text-card-foreground">Add to Deck</h2>
            <button 
              onClick={onClose} 
              className="text-card-foreground hover:text-muted-foreground transition-colors duration-200"
              disabled={isAddingToDeck}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto">
            {/* Community response suggested deck option */}
            {communityResponse && (
              <div
                className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToDeck ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isAddingToDeck && handleCommunityImport(existingCommunityDeck?.id, !existingCommunityDeck)}
              >
                <PlusCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>
                  {existingCommunityDeck ? '' : 'create and '}
                  add to "{communityResponse.deckTitle}"
                </span>
              </div>
            )}
            
            {/* Regular new deck option */}
            <div
              className={`cursor-pointer text-primary hover:bg-accent p-2 rounded-sm flex items-center ${isAddingToDeck ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isAddingToDeck && setIsCreateModalOpen(true)}
            >
              <PlusCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>create new deck</span>
            </div>
            
            <FilterableDeckList
              decks={decks}
              reservedDeckTitles={reservedDeckTitles}
              variant="modal"
              onDeckSelect={(id, title) => communityResponse ? handleCommunityImport(id) : handleAddToDeck(id)}
              isLoading={isLoading}
              isAddingToDeck={isAddingToDeck}
            />
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateDeckModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onDeckCreated={handleCreateAndAddToDeck}
          reservedDeckTitles={reservedDeckTitles}
          optionalCopy='Add to New Deck'
        />
      )}
    </>
  );
}
