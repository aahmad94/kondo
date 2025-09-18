'use client';

import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface Deck {
  id: string;
  title: string;
  updatedAt?: string;
}

interface FilterableDeckListProps {
  decks: Deck[];
  reservedDeckTitles: string[];
  variant: 'sidebar' | 'modal';
  onDeckSelect: (id: string, title: string) => void;
  selectedDeckId?: string;
  isLoading: boolean;
  isAddingToDeck?: boolean;
  showDeckDropdown?: string | null;
  onChevronClick?: (deck: Deck, e: React.MouseEvent) => void;
  onChevronTouch?: (deck: Deck, e: React.TouchEvent) => void;
  onEditClick?: (deck: Deck, e: React.MouseEvent) => void;
  onDeleteClick?: (deck: Deck, e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent, deckId: string, deckTitle: string) => void;
  onTouchEnd?: (e: React.TouchEvent, deckId: string, deckTitle: string) => void;
}

export function FilterableDeckList({
  decks,
  reservedDeckTitles,
  variant,
  onDeckSelect,
  selectedDeckId,
  isLoading,
  isAddingToDeck = false,
  showDeckDropdown,
  onChevronClick,
  onChevronTouch,
  onEditClick,
  onDeleteClick,
  onTouchStart,
  onTouchEnd
}: FilterableDeckListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDecks = useMemo(() => {
    return decks
      .filter(deck => !reservedDeckTitles.includes(deck.title))
      .filter(deck => 
        deck.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a: Deck, b: Deck) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [decks, reservedDeckTitles, searchTerm]);

  const handleDeckClick = (deck: Deck) => {
    if (isAddingToDeck) return;
    onDeckSelect(deck.id, deck.title);
  };

  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col px-1">
        {/* Search Bar */}
        <div className="pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="filter decks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Deck List */}
        <div className="overflow-y-auto deck-list max-h-[60vh] min-h-[200px] pb-16">
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
          ) : filteredDecks.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 px-2">
              {searchTerm ? 'No decks found' : 'No decks yet'}
            </div>
          ) : (
            filteredDecks.map((deck) => (
              <div
                key={deck.id}
                className={`mb-2 cursor-pointer hover:bg-accent hover:rounded-sm transition-all pl-2 py-1 flex justify-between items-center group relative
                  ${selectedDeckId === deck.id ? 'bg-accent rounded-sm' : ''}`}
                onClick={() => handleDeckClick(deck)}
                onTouchStart={onTouchStart ? (e) => onTouchStart(e, deck.id, deck.title) : undefined}
                onTouchEnd={onTouchEnd ? (e) => onTouchEnd(e, deck.id, deck.title) : undefined}
              >
                <span className="text-card-foreground flex-1 truncate">
                  {deck.title}
                </span>
                {onChevronClick && (
                  <div className="relative">
                    <ChevronDownIcon
                      className={`deck-chevron-button h-5 w-5 mr-1 text-muted-foreground hover:text-card-foreground transition-colors duration-200
                        ${selectedDeckId === deck.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      onClick={(e) => onChevronClick(deck, e)}
                      onTouchEnd={onChevronTouch ? (e) => onChevronTouch(deck, e) : undefined}
                    />
                    {showDeckDropdown === deck.id && (
                      <div className="deck-dropdown-menu absolute right-0 top-full mt-1 rounded-md shadow-lg bg-popover ring-1 ring-border z-[60] min-w-[80px]">
                        <div className="py-1">
                          {onEditClick && (
                            <button
                              onClick={(e) => onEditClick(deck, e)}
                              className="flex items-center w-full px-3 py-1.5 text-xs text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
                            >
                              Edit
                            </button>
                          )}
                          {onDeleteClick && (
                            <button
                              onClick={(e) => onDeleteClick(deck, e)}
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
          placeholder="filter decks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Deck List */}
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
        ) : filteredDecks.length === 0 ? (
          <li className="text-center text-muted-foreground py-4">
            {searchTerm ? 'No decks found' : 'No decks yet'}
          </li>
        ) : (
          filteredDecks.map((deck) => (
            <li
              key={deck.id}
              className={`cursor-pointer text-card-foreground hover:bg-accent p-2 rounded-sm ${isAddingToDeck ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleDeckClick(deck)}
            >
              {deck.title}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
