'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { StyledMarkdown } from './ui';
import { useIsMobile } from '../hooks/useIsMobile';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: string;
  isEditing: boolean;
  onSave?: (note: string) => Promise<void>;
  onEdit?: () => void;
  isSaving?: boolean;
}

const NoteModal: React.FC<NoteModalProps> = ({ 
  isOpen, 
  onClose, 
  note,
  isEditing,
  onSave,
  onEdit,
  isSaving = false
}) => {
  const [noteText, setNoteText] = useState(note);
  const [localIsSaving, setLocalIsSaving] = useState(false);
  const { isMobile } = useIsMobile();

  // Update local note text when prop changes
  useEffect(() => {
    setNoteText(note);
  }, [note]);

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      setLocalIsSaving(true);
      await onSave(noteText);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLocalIsSaving(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
  };

  if (!isOpen) return null;

  const isLoading = isSaving || localIsSaving;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[80]">
      <div className="bg-card border border-border p-6 rounded-sm w-[650px] max-w-[90vw] max-h-[80vh] min-h-[30vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Note' : 'View Note'}
          </h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mb-4">
          {isEditing ? (
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here... (supports markdown)"
              className="w-full h-full min-h-[200px] p-3 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 resize-none"
              disabled={isLoading}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-background border border-border rounded-md overflow-y-auto min-h-[200px] max-h-[400px]">
              {note ? (
                <StyledMarkdown>{note}</StyledMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No note available</p>
              )}
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border flex-shrink-0">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isLoading || !noteText.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteModal;

