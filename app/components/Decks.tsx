'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, QueueListIcon, XCircleIcon, DocumentTextIcon, WrenchIcon, AcademicCapIcon, ChevronDownIcon, BuildingLibraryIcon } from '@heroicons/react/24/solid';
import CreateDeckModal from './CreateDeckModal';
import DeleteDeckModal from './DeleteDeckModal';
import EditDeckModal from './EditDeckModal';
import { useRouter } from 'next/navigation';
import { trackDeckSelect, trackClearDeck, trackCreateDeck } from '@/lib/analytics';
import { useIsMobile } from '../hooks/useIsMobile';
import { FilterableDeckList } from './FilterableDeckList';

interface Deck {
  id: string;
  title: string;
  updatedAt?: string;
}

interface DecksProps {
  changeSelectedDeck: (deckId: string|null, deckTitle: string|null) => void;
  selectedDeck: { id: string | null, title: string | null };
  reservedDeckTitles: string[];
  selectedLanguage: string;
  onClearDeck: () => void;
  newDeck: { id: string, title: string } | null;
}

export default function Decks({ 
  changeSelectedDeck, 
  selectedDeck, 
  reservedDeckTitles,
  selectedLanguage, 
  onClearDeck, 
  newDeck 
}: DecksProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);
  const [showDeckDropdown, setShowDeckDropdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const deckDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the clicked element is within any dropdown menu
      const target = event.target as HTMLElement;
      const isWithinDropdown = target.closest('.deck-dropdown-menu');
      const isChevronButton = target.closest('.deck-chevron-button');
      
      if (!isWithinDropdown && !isChevronButton) {
        setShowDeckDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchDecks = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/getBookmarks?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch decks');
      }
      const data = await response.json();
      setDecks(data);

      // If no decks exist, create default ones
      if (data.length === 0) {
        // remove this once we have a way to create default decks
        // await createDefaultDecks(userId);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultDecks = async (userId: string) => {
    const defaultDecks = ['counting', 'alphabet', 'verbs', 'introductions', 'daily summary'];
    
    try {
      for (const title of defaultDecks) {
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
          throw new Error(`Failed to create default deck: ${title}`);
        }

        const newDeck = await response.json();
        // Track deck creation
        await trackCreateDeck(newDeck.id, newDeck.title);
      }

      // After creating all default decks, refetch the complete list
      await fetchDecks(userId);
    } catch (error) {
      console.error('Error creating default decks:', error);
    }
  };

  // Refetch decks when language changes
  useEffect(() => {
    setDecks([]);
    if (session?.userId) {
      fetchDecks(session.userId);
    }
  }, [selectedLanguage, newDeck]);

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

  const handleDeckInteraction = async (deckId: string, deckTitle: string) => {
    // Track deck selection
    await trackDeckSelect(deckId, deckTitle);
    // Update URL with new query parameters using the App Router pattern
    router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
    changeSelectedDeck(deckId, deckTitle);
    
    // close decks if on mobile
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleCreateNewDeck = () => {
    setIsCreateModalOpen(true);
  };

  const handleDeckCreated = async (newDeck: Deck) => {
    setDecks([...decks, newDeck]);
    setIsCreateModalOpen(false);
    // Track deck creation
    await trackCreateDeck(newDeck.id, newDeck.title);
  };

  const handleDeleteClick = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeckToDelete(deck);
    setIsDeleteModalOpen(true);
    setShowDeckDropdown(null);
  };

  const handleEditClick = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeckToEdit(deck);
    setIsEditModalOpen(true);
    setShowDeckDropdown(null);
  };

  const handleDeckUpdated = (updatedDeck: Deck) => {
    setDecks(decks.map(b => 
      b.id === updatedDeck.id ? updatedDeck : b
    ));
    setIsEditModalOpen(false);
    setDeckToEdit(null);
    
    // If the updated deck is currently selected, update the selected deck title
    if (selectedDeck.id === updatedDeck.id) {
      changeSelectedDeck(updatedDeck.id, updatedDeck.title);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deckToDelete && session?.userId) {
      try {
        const response = await fetch('/api/deleteBookmark', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.userId,
            bookmarkId: deckToDelete.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete deck');
        }

        setDecks(decks.filter(b => b.id !== deckToDelete.id));
        if (selectedDeck.id === deckToDelete.id) {
          changeSelectedDeck(null, null);
          // Track deck clearing
          await trackClearDeck();
        }
        setIsDeleteModalOpen(false);
        setDeckToDelete(null);
      } catch (error) {
        console.error('Error deleting deck:', error);
      }
    }
  };

  const handleChatClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
    changeSelectedDeck(null, null); // This sets the chat as "selected" state
    onClearDeck();
    // Track deck clearing when clicking chat
    await trackClearDeck();
  };

  const handleCommunityClick = async () => {
    // Update URL to community deck
    router.push('/?deckTitle=community');
    changeSelectedDeck(null, 'community');
    // Track community selection
    await trackDeckSelect('community', 'community');
    
    // Close decks if on mobile
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleChevronClick = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeckDropdown(showDeckDropdown === deck.id ? null : deck.id);
  };

  const handleChevronTouch = (deck: Deck, e: React.TouchEvent) => {
    e.stopPropagation();
    setShowDeckDropdown(showDeckDropdown === deck.id ? null : deck.id);
  };

  const handleTouchStart = (e: React.TouchEvent, deckId: string, deckTitle: string) => {
    // Check if the touch target is the chevron or within the chevron area
    const target = e.target as HTMLElement;
    const chevronElement = target.closest('.deck-chevron-button');
    
    if (chevronElement) {
      // If touching the chevron, don't start the deck selection touch tracking
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent, deckId: string, deckTitle: string) => {
    // Check if the touch target is the chevron or within the chevron area
    const target = e.target as HTMLElement;
    const chevronElement = target.closest('.deck-chevron-button');
    
    if (chevronElement) {
      // If touching the chevron, don't handle deck selection
      return;
    }

    if (!touchStartY.current || !touchStartTime.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const deltaY = Math.abs(touchEndY - touchStartY.current);
    const deltaTime = touchEndTime - touchStartTime.current;

    // If it's a quick tap (less than 200ms) and minimal movement (less than 10px)
    if (deltaTime < 200 && deltaY < 10) {
      handleDeckInteraction(deckId, deckTitle);
    }

    // Reset touch tracking
    touchStartY.current = null;
    touchStartTime.current = null;
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed top-[56px] h-[50px] w-8 rounded-r-md bg-card/80 border-t border-r border-b border-border ml-0 flex items-center justify-center z-10">
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
                    className={`chat-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedDeck.id === null && selectedDeck.title === null ? 'bg-accent rounded-sm' : ''}`}
                    onClick={handleChatClick}
                  >
                    <WrenchIcon className="h-4 w-4 inline mr-2 text-black dark:text-white"/>
                    <span className="text-black dark:text-white">create</span>
                  </div>

                  <div
                    className={`community-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedDeck.title === "community" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={handleCommunityClick}
                  >
                    <BuildingLibraryIcon className="h-4 w-4 inline mr-2 text-purple-400"/>
                    <span className="text-purple-400">community</span>
                  </div>

                  <div 
                    className={`daily-summary-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedDeck.title === "daily summary" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={() => {
                      const dailySummaryDeck = decks.find(b => b.title === 'daily summary');
                      if (dailySummaryDeck) {
                        handleDeckInteraction(dailySummaryDeck.id, dailySummaryDeck.title);
                      }
                    }}
                  >
                    <AcademicCapIcon className="h-4 w-4 inline mr-2 text-phrase-text"/>
                    <span className="text-phrase-text">dojo</span>
                  </div>

                  <div 
                    className={`all-responses-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block
                      ${selectedDeck.id === "all" ? 'bg-accent rounded-sm' : ''}`}
                    onClick={() => handleDeckInteraction("all", "all responses")}
                    onTouchStart={() => handleDeckInteraction("all", "all responses")}
                  >
                    <QueueListIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">all responses</span>
                  </div>

                  <div
                    className="create-deck-button cursor-pointer hover:bg-accent hover:rounded-sm transition-all px-2 py-1 inline-block"
                    onClick={handleCreateNewDeck}
                  >
                    <PlusCircleIcon className="h-4 w-4 inline mr-2 text-blue-400"/>
                    <span className="text-blue-400">new deck</span>
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
                <FilterableDeckList
                  decks={decks}
                  reservedDeckTitles={reservedDeckTitles}
                  variant="sidebar"
                  onDeckSelect={handleDeckInteraction}
                  selectedDeckId={selectedDeck.id || undefined}
                  isLoading={isLoading}
                  showDeckDropdown={showDeckDropdown}
                  onChevronClick={handleChevronClick}
                  onChevronTouch={handleChevronTouch}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteClick}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {isCreateModalOpen && (
        <CreateDeckModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onDeckCreated={handleDeckCreated}
          reservedDeckTitles={reservedDeckTitles}
        />
      )}
      {isDeleteModalOpen && deckToDelete && (
        <DeleteDeckModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          deckTitle={deckToDelete.title}
        />
      )}
      {isEditModalOpen && deckToEdit && (
        <EditDeckModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onDeckUpdated={handleDeckUpdated}
          deck={deckToEdit}
          reservedDeckTitles={reservedDeckTitles}
        />
      )}
    </>
  );
}
