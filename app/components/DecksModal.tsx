import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import CreateDeckModal from './CreateDeckModal';
import { useRouter } from 'next/navigation';
import { FilterableDeckList } from './FilterableDeckList';
import { StreakCelebrationModal } from './ui';

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
  responseType?: 'clarification' | 'response' | 'instruction';
  onDeckCreated?: (newDeck: { id: string, title: string }) => void;
  onDeckSelect?: (id: string | null, title: string | null) => void;
  // Community import props
  communityResponse?: CommunityResponseForImport;
  onCommunityImport?: (communityResponseId: string, deckId?: string, createNew?: boolean) => Promise<void>;
  onDecksRefresh?: () => void;
  // Callback for successful GPT response addition (without immediate navigation)
  onGPTResponseAdded?: (deckId: string, deckTitle: string) => void;
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
  responseType = 'response',
  onDeckCreated,
  onDeckSelect,
  communityResponse,
  onCommunityImport,
  onDecksRefresh,
  onGPTResponseAdded
}: DecksModalProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToDeck, setIsAddingToDeck] = useState(false);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [streakData, setStreakData] = useState<{ currentStreak: number; maxStreak: number } | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{ deckId: string; deckTitle: string } | null>(null);
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
      
      // Detect user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
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
          isKanaEnabled,
          responseType,
          timezone: userTimezone
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Parse response to check for streak data
      const result = await res.json();
      
      // Check if we should celebrate a streak
      const shouldCelebrate = result.streakData?.isNewStreak;
      
      // Find the deck info regardless of celebration
      const deck = decks.find(b => b.id === deckId);
      
      if (shouldCelebrate) {
        setStreakData({
          currentStreak: result.streakData.currentStreak,
          maxStreak: result.streakData.maxStreak
        });
        setShowStreakCelebration(true);
        
        // Store navigation info for the celebration modal button
        if (deck && !communityResponse) {
          setPendingNavigation({ deckId: deck.id, deckTitle: deck.title });
        }
        
        // Refresh the decks sidebar immediately (don't wait)
        if (onDecksRefresh) {
          onDecksRefresh();
        }
      } else {
        // No celebration - for GPTResponse, notify parent to show navigation modal
        if (deck && !communityResponse) {
          // Notify parent that GPTResponse was successfully added
          onGPTResponseAdded?.(deck.id, deck.title);
        } else if (deck && communityResponse) {
          // For community responses, navigate immediately (they handle it differently)
          router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deck.title)}`);
          onDeckSelect?.(deckId, deck.title);
        }

        // Refresh the decks sidebar to show updated timestamps
        if (onDecksRefresh) {
          onDecksRefresh();
        }
        
        // Close the modal after successful addition
        onClose();
      }
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
      // handleAddToDeck handles closing and celebration internally
      // Don't call onDeckSelect here as it will interfere with streak celebration
      // The celebration modal or handleAddToDeck will handle navigation
    }

    setIsCreateModalOpen(false);
  };

  // Handler for community response imports
  const handleCommunityImport = async (deckId?: string, createNew?: boolean) => {
    if (!communityResponse || !onCommunityImport) return;

    try {
      setIsAddingToDeck(true);
      // onCommunityImport doesn't return anything, but streak checking happens in ChatBox.tsx
      // which receives the result from the action and could pass streak info back
      // For now, we'll rely on the parent (ChatBox) to handle streak celebrations
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

      {/* Streak Celebration Modal */}
      {streakData && (
        <StreakCelebrationModal
            isOpen={showStreakCelebration}
            currentStreak={streakData.currentStreak}
            maxStreak={streakData.maxStreak}
            showNavigateButton={!!pendingNavigation}
            onNavigateToDeck={pendingNavigation ? () => {
              router.push(`/?deckId=${pendingNavigation.deckId}&deckTitle=${encodeURIComponent(pendingNavigation.deckTitle)}`);
              onDeckSelect?.(pendingNavigation.deckId, pendingNavigation.deckTitle);
            } : undefined}
            onClose={() => {
              setShowStreakCelebration(false);
              // If user closes celebration without navigating, show navigation modal instead
              if (pendingNavigation && !communityResponse) {
                onGPTResponseAdded?.(pendingNavigation.deckId, pendingNavigation.deckTitle);
              }
              setPendingNavigation(null);
              // Also close the DecksModal after celebration
              onClose();
            }}
          />
      )}
    </>
  );
}
