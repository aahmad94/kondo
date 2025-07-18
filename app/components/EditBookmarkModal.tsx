import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';
import { BookmarkClientService } from '../../lib/bookmarkClientService';

interface EditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkUpdated: (updatedBookmark: { id: string; title: string }) => void;
  bookmark: { id: string; title: string };
  reservedBookmarkTitles: string[];
}

export default function EditBookmarkModal({ 
  isOpen, 
  onClose, 
  onBookmarkUpdated, 
  bookmark, 
  reservedBookmarkTitles 
}: EditBookmarkModalProps) {
  const [bookmarkTitle, setBookmarkTitle] = useState(bookmark.title);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const handleEditBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !bookmarkTitle.trim()) return;

    setError(null);
    setIsLoading(true);

    // Don't validate if the title hasn't changed
    if (bookmarkTitle.trim() === bookmark.title) {
      onClose();
      setIsLoading(false);
      return;
    }

    const validationError = BookmarkClientService.validateBookmarkTitle(bookmarkTitle.trim(), reservedBookmarkTitles);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      const updatedBookmark = await BookmarkClientService.editBookmark({
        id: bookmark.id,
        title: bookmarkTitle.trim(),
        userId: session.userId,
      });

      onBookmarkUpdated(updatedBookmark);
      onClose();
    } catch (error) {
      console.error('Error updating bookmark:', error);
      setError(error instanceof Error ? error.message : 'Failed to update bookmark. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setBookmarkTitle(bookmark.title); // Reset to original title
    setError(null);
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Bookmark"
    >
      <form onSubmit={handleEditBookmark}>
        <input
          type="text"
          value={bookmarkTitle}
          onChange={(e) => setBookmarkTitle(e.target.value)}
          placeholder="Enter bookmark name"
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded-sm"
        />
        {error && (
          <div className="text-red-500 mb-4 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-gray-600 text-white p-2 rounded-sm hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-500 text-white p-2 rounded-sm hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </FormModal>
  );
} 