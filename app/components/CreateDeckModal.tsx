import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated: (newDeck: { id: string; title: string }) => void;
  reservedDeckTitles: string[];
  optionalCopy?: string;
  isImportingEntireDeck?: boolean;
  communityDeckTitle?: string;
  userDecks?: Array<{ id: string; title: string }>;
  onImportToExistingDeck?: (deckId: string) => void;
}

export default function CreateDeckModal({ 
  isOpen, 
  onClose, 
  onDeckCreated, 
  reservedDeckTitles, 
  optionalCopy,
  isImportingEntireDeck = false,
  communityDeckTitle,
  userDecks = [],
  onImportToExistingDeck
}: CreateDeckModalProps) {
  const [deckTitle, setDeckTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'new' | 'create' | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const { data: session } = useSession();

  // Find existing deck with matching title
  const existingDeck = isImportingEntireDeck && communityDeckTitle 
    ? userDecks.find(deck => 
        deck.title.toLowerCase() === communityDeckTitle.toLowerCase()
      )
    : null;

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle import to existing deck
    if (isImportingEntireDeck && importMode === 'merge' && existingDeck) {
      if (onImportToExistingDeck) {
        onImportToExistingDeck(existingDeck.id);
        onClose();
      }
      return;
    }

    // Handle import to selected different deck
    if (isImportingEntireDeck && importMode === 'new' && selectedDeckId) {
      if (onImportToExistingDeck) {
        onImportToExistingDeck(selectedDeckId);
        onClose();
      }
      return;
    }

    // Handle regular deck creation (including import to new deck)
    if (!session?.userId) return;
    
    // For import create mode, use community deck title as default
    const titleToUse = isImportingEntireDeck && importMode === 'create' 
      ? (deckTitle.trim() || communityDeckTitle || '')
      : deckTitle.trim();
    
    if (!titleToUse) return;

    setError(null); // Reset error state

    if (reservedDeckTitles.includes(titleToUse)) {
      setError('This deck title is reserved.');
      return;
    }

    try {
      const response = await fetch('/api/createBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: titleToUse,
          userId: session.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      onDeckCreated(data);
      setDeckTitle('');
      onClose();
    } catch (error) {
      console.error('Error creating deck:', error);
      setError('Failed to create deck. Please try again.');
    }
  };

  const modalTitle = isImportingEntireDeck 
    ? `Import "${communityDeckTitle}" Deck`
    : "Create New Deck";

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
    >
      <form onSubmit={handleCreateDeck}>
        {isImportingEntireDeck ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose how to import content from "{communityDeckTitle}" deck:
            </p>

            {existingDeck && (
              <div>
                <label className="flex items-center space-x-2 p-3 border border-border rounded-sm hover:bg-muted cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={(e) => setImportMode(e.target.value as 'merge')}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium">Merge with existing "{existingDeck.title}"</div>
                    <div className="text-sm text-muted-foreground">Add all responses to your existing deck</div>
                  </div>
                </label>
              </div>
            )}

            <div>
              <label className="flex items-start space-x-2 p-3 border border-border rounded-sm hover:bg-muted cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="new"
                  checked={importMode === 'new'}
                  onChange={(e) => setImportMode(e.target.value as 'new')}
                  className="text-primary focus:ring-primary mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">Add to a different deck</div>
                  <div className="text-sm text-muted-foreground mb-2">Choose an existing deck to add all responses to</div>
                  {importMode === 'new' && (
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="w-full p-2 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Select a deck...</option>
                      {userDecks
                        .filter(deck => deck.id !== existingDeck?.id)
                        .map(deck => (
                          <option key={deck.id} value={deck.id}>
                            {deck.title}
                          </option>
                        ))
                      }
                    </select>
                  )}
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-start space-x-2 p-3 border border-border rounded-sm hover:bg-muted cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="create"
                    checked={importMode === 'create'}
                    onChange={(e) => setImportMode('create' as const)}
                    className="text-primary focus:ring-primary mt-1"
                  />
                <div className="flex-1">
                  <div className="font-medium">Create new deck</div>
                  <div className="text-sm text-muted-foreground mb-2">Create a new deck with a custom name</div>
                  {importMode === 'create' && (
                    <input
                      type="text"
                      value={deckTitle}
                      onChange={(e) => setDeckTitle(e.target.value)}
                      placeholder={`Enter deck name (default: ${communityDeckTitle})`}
                      className="w-full p-2 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        ) : (
          <input
            type="text"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            placeholder="Enter deck name"
            className="w-full p-2 mb-4 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        )}

        {error && (
          <div className="text-destructive mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isImportingEntireDeck && (
              !importMode || 
              (importMode === 'new' && !selectedDeckId) ||
              (importMode === 'create' && !deckTitle.trim())
            )
          }
          className="w-full bg-primary text-primary-foreground mt-4 p-2 rounded-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isImportingEntireDeck ? 'Import Deck' : (optionalCopy || 'Create Deck')}
        </button>
      </form>
    </FormModal>
  );
}
