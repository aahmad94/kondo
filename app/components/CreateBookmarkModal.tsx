import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';

interface CreateBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookmarkCreated: (newBookmark: { id: string; title: string }) => void;
  reservedBookmarkTitles: string[];
  optionalCopy?: string;
  isImportingEntireBookmark?: boolean;
  communityBookmarkTitle?: string;
  userBookmarks?: Array<{ id: string; title: string }>;
  onImportToExistingBookmark?: (bookmarkId: string) => void;
}

export default function CreateBookmarkModal({ 
  isOpen, 
  onClose, 
  onBookmarkCreated, 
  reservedBookmarkTitles, 
  optionalCopy,
  isImportingEntireBookmark = false,
  communityBookmarkTitle,
  userBookmarks = [],
  onImportToExistingBookmark
}: CreateBookmarkModalProps) {
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'new' | 'create' | null>(null);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string>('');
  const { data: session } = useSession();

  // Find existing bookmark with matching title
  const existingBookmark = isImportingEntireBookmark && communityBookmarkTitle 
    ? userBookmarks.find(bookmark => 
        bookmark.title.toLowerCase() === communityBookmarkTitle.toLowerCase()
      )
    : null;

  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle import to existing bookmark
    if (isImportingEntireBookmark && importMode === 'merge' && existingBookmark) {
      if (onImportToExistingBookmark) {
        onImportToExistingBookmark(existingBookmark.id);
        onClose();
      }
      return;
    }

    // Handle import to selected different bookmark
    if (isImportingEntireBookmark && importMode === 'new' && selectedBookmarkId) {
      if (onImportToExistingBookmark) {
        onImportToExistingBookmark(selectedBookmarkId);
        onClose();
      }
      return;
    }

    // Handle regular bookmark creation (including import to new bookmark)
    if (!session?.userId) return;
    
    // For import create mode, use community bookmark title as default
    const titleToUse = isImportingEntireBookmark && importMode === 'create' 
      ? (bookmarkTitle.trim() || communityBookmarkTitle || '')
      : bookmarkTitle.trim();
    
    if (!titleToUse) return;

    setError(null); // Reset error state

    if (reservedBookmarkTitles.includes(titleToUse)) {
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
          title: titleToUse,
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

  const modalTitle = isImportingEntireBookmark 
    ? `Import "${communityBookmarkTitle}" Bookmark`
    : "Create New Bookmark";

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
    >
      <form onSubmit={handleCreateBookmark}>
        {isImportingEntireBookmark ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose how to import content from "{communityBookmarkTitle}" bookmark:
            </p>

            {existingBookmark && (
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
                    <div className="font-medium">Merge with existing "{existingBookmark.title}"</div>
                    <div className="text-sm text-muted-foreground">Add all responses to your existing bookmark</div>
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
                  <div className="font-medium">Add to a different bookmark</div>
                  <div className="text-sm text-muted-foreground mb-2">Choose an existing bookmark to add all responses to</div>
                  {importMode === 'new' && (
                    <select
                      value={selectedBookmarkId}
                      onChange={(e) => setSelectedBookmarkId(e.target.value)}
                      className="w-full p-2 bg-input text-foreground border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Select a bookmark...</option>
                      {userBookmarks
                        .filter(bookmark => bookmark.id !== existingBookmark?.id)
                        .map(bookmark => (
                          <option key={bookmark.id} value={bookmark.id}>
                            {bookmark.title}
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
                  <div className="font-medium">Create new bookmark</div>
                  <div className="text-sm text-muted-foreground mb-2">Create a new bookmark with a custom name</div>
                  {importMode === 'create' && (
                    <input
                      type="text"
                      value={bookmarkTitle}
                      onChange={(e) => setBookmarkTitle(e.target.value)}
                      placeholder={`Enter bookmark name (default: ${communityBookmarkTitle})`}
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
            value={bookmarkTitle}
            onChange={(e) => setBookmarkTitle(e.target.value)}
            placeholder="Enter bookmark name"
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
            isImportingEntireBookmark && (
              !importMode || 
              (importMode === 'new' && !selectedBookmarkId) ||
              (importMode === 'create' && !bookmarkTitle.trim())
            )
          }
          className="w-full bg-primary text-primary-foreground mt-4 p-2 rounded-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isImportingEntireBookmark ? 'Import Bookmark' : (optionalCopy || 'Create Bookmark')}
        </button>
      </form>
    </FormModal>
  );
}
