import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkCreated: (newBookmark: { id: string; title: string }) => void;
  reservedBookmarkTitles: string[];
  optionalCopy?: string;
}

export default function CreateBookmarkModal({ isOpen, onClose, onBookmarkCreated, reservedBookmarkTitles, optionalCopy }: CreateBookmarkModalProps) {
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !bookmarkTitle.trim()) return;

    setError(null); // Reset error state

    if (reservedBookmarkTitles.includes(bookmarkTitle)) {
      setError('This bookmark title is reserved.');
      return;
    }

    try {
      const response = await fetch('/api/createBookmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: bookmarkTitle,
          userId: session.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      onBookmarkCreated(data);
      setBookmarkTitle('');
      onClose();
    } catch (error) {
      console.error('Error creating bookmark:', error);
      setError('Failed to create bookmark. Please try again.');
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Bookmark"
    >
      <form onSubmit={handleCreateBookmark}>
        <input
          type="text"
          value={bookmarkTitle}
          onChange={(e) => setBookmarkTitle(e.target.value)}
          placeholder="Enter bookmark name"
          className="w-full p-2 mb-4 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        {error && (
          <div className="text-destructive mb-4 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground p-2 rounded-sm hover:bg-primary/90 transition-colors duration-200"
        >
          {optionalCopy || 'Create Bookmark'}
        </button>
      </form>
    </FormModal>
  );
}
