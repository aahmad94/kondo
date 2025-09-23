import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';
import { BookmarkClientService } from '@/lib/bookmarks';

interface EditDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckUpdated: (updatedDeck: { id: string; title: string }) => void;
  deck: { id: string; title: string };
  reservedDeckTitles: string[];
}

export default function EditDeckModal({ 
  isOpen, 
  onClose, 
  onDeckUpdated, 
  deck, 
  reservedDeckTitles 
}: EditDeckModalProps) {
  const [deckTitle, setDeckTitle] = useState(deck.title);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const handleEditDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !deckTitle.trim()) return;

    setError(null);
    setIsLoading(true);

    // Don't validate if the title hasn't changed
    if (deckTitle.trim() === deck.title) {
      onClose();
      setIsLoading(false);
      return;
    }

    const validationError = BookmarkClientService.validateBookmarkTitle(deckTitle.trim(), reservedDeckTitles);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      const updatedDeck = await BookmarkClientService.editBookmark({
        id: deck.id,
        title: deckTitle.trim(),
        userId: session.userId,
      });

      onDeckUpdated(updatedDeck);
      onClose();
    } catch (error) {
      console.error('Error updating deck:', error);
      setError(error instanceof Error ? error.message : 'Failed to update deck. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDeckTitle(deck.title); // Reset to original title
    setError(null);
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Deck"
    >
      <form onSubmit={handleEditDeck}>
        <input
          type="text"
          value={deckTitle}
          onChange={(e) => setDeckTitle(e.target.value)}
          placeholder="Enter deck name"
          className="w-full p-2 mb-4 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-muted-foreground"
        />
        {error && (
          <div className="text-destructive mb-4 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-secondary text-secondary-foreground p-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary text-primary-foreground p-2 rounded-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </FormModal>
  );
} 