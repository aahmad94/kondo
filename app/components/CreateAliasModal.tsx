'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';
import { 
  createUserAliasAction, 
  validateAliasAction 
} from '@/actions/community';

interface CreateAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAliasCreated: (alias: string) => void;
}

export default function CreateAliasModal({ isOpen, onClose, onAliasCreated }: CreateAliasModalProps) {
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();

  // Real-time validation with debouncing
  useEffect(() => {
    if (!alias.trim()) {
      setValidationMessage(null);
      return;
    }

    // Clear previous timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    // Set new timer for validation
    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await validateAliasAction(alias);
        if (result.isValid) {
          setValidationMessage('✓ Alias is available');
        } else {
          setValidationMessage(result.error || 'Alias not available');
        }
      } catch (error) {
        setValidationMessage('Unable to validate alias');
      } finally {
        setIsValidating(false);
      }
    }, 500);

    setValidationTimer(timer);

    // Cleanup function
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [alias]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [validationTimer]);

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !alias.trim()) return;

    setError(null);
    setIsCreating(true);

    try {
      const result = await createUserAliasAction(alias);
      
      if (result.success) {
        onAliasCreated(alias);
        setAlias('');
        onClose();
      } else {
        setError(result.error || 'Failed to create alias');
      }
    } catch (error) {
      console.error('Error creating alias:', error);
      setError('Failed to create alias. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setAlias('');
    setError(null);
    setValidationMessage(null);
    if (validationTimer) {
      clearTimeout(validationTimer);
    }
    onClose();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Your Alias"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose an alias to represent you in the community feed. This will be displayed when you share responses.
        </p>
        
        <form onSubmit={handleCreateAlias} className="space-y-4">
          <div>
            <label htmlFor="alias" className="block text-sm font-medium text-card-foreground mb-2">
              Alias
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                id="alias"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="your_alias"
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
                disabled={isCreating}
              />
            </div>
            
            {/* Real-time validation feedback */}
            {alias.trim() && (
              <div className="mt-2 text-xs">
                {isValidating ? (
                  <span className="text-muted-foreground">Checking availability...</span>
                ) : validationMessage ? (
                  <span className={validationMessage.startsWith('✓') ? 'text-green-600' : 'text-destructive'}>
                    {validationMessage}
                  </span>
                ) : null}
              </div>
            )}
            
            <div className="mt-2 text-xs text-muted-foreground">
              3-20 characters. Letters, numbers, underscores, and hyphens only.
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!alias.trim() || isCreating || isValidating || (!!validationMessage && !validationMessage.startsWith('✓'))}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Alias'}
            </button>
          </div>
        </form>
      </div>
    </FormModal>
  );
}
