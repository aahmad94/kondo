'use client';

import { XMarkIcon } from '@heroicons/react/24/solid';

interface DeckNavigationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  additionalMessage?: string;
  deckInfo: {
    id: string;
    title: string;
  } | null;
  onNavigateToDeck: (deckId: string, deckTitle: string) => void;
  onStayHere: () => void;
  /** If true, shows "Go to Community" instead of "Go to Deck" */
  navigateToCommunity?: boolean;
  onNavigateToCommunity?: () => void;
}

/**
 * Shared modal component for deck/community navigation after successful actions
 * Used after: importing community responses, adding GPTResponses to decks, sharing to community
 */
export function DeckNavigationModal({
  isOpen,
  title,
  message,
  additionalMessage,
  deckInfo,
  onNavigateToDeck,
  onStayHere,
  navigateToCommunity = false,
  onNavigateToCommunity
}: DeckNavigationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
      <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l text-card-foreground">{title}</h2>
          <button 
            onClick={onStayHere} 
            className="text-card-foreground hover:text-muted-foreground transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <p className="text-card-foreground">
          {message}
        </p>

        {additionalMessage && (
          <p className="text-card-foreground mt-4 mb-4">
            {additionalMessage}
          </p>
        )}

        {!additionalMessage && <div className="mb-4" />}

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          {navigateToCommunity && onNavigateToCommunity ? (
            <>
              <button
                onClick={onNavigateToCommunity}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
              >
                Go to Community
              </button>
              <button
                onClick={onStayHere}
                className="flex-1 px-4 py-2 text-sm bg-muted text-muted-foreground rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Stay Here
              </button>
            </>
          ) : deckInfo ? (
            <>
              <button
                onClick={() => {
                  onNavigateToDeck(deckInfo.id, deckInfo.title);
                  onStayHere();
                }}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
              >
                Go to Deck
              </button>
              <button
                onClick={onStayHere}
                className="flex-1 px-4 py-2 text-sm bg-muted text-muted-foreground rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Stay Here
              </button>
            </>
          ) : (
            <button
              onClick={onStayHere}
              className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

