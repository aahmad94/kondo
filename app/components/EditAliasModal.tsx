'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import FormModal from './ui/FormModal';
import {
  validateAliasAction,
  switchUserAliasAction
} from '@/actions/community';
import { useUserAlias } from '../contexts/UserAliasContext';

interface PreviousAlias {
  id: string;
  alias: string;
  createdAt: string;
}

interface EditAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAliasUpdated: (newAlias: string) => void;
  currentAlias: string;
}

export default function EditAliasModal({ isOpen, onClose, onAliasUpdated, currentAlias }: EditAliasModalProps) {
  const [alias, setAlias] = useState(currentAlias);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(null);
  const [previousAliases, setPreviousAliases] = useState<PreviousAlias[]>([]);
  const [isLoadingAliases, setIsLoadingAliases] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const { data: session } = useSession();
  const { updateAlias: updateAliasInContext, refreshData } = useUserAlias();

  // Reset alias and fetch previous aliases when modal opens
  useEffect(() => {
    if (isOpen) {
      setAlias(currentAlias);
      setError(null);
      setValidationMessage(null);
      fetchPreviousAliases();
    }
  }, [isOpen, currentAlias]);

  const fetchPreviousAliases = async () => {
    setIsLoadingAliases(true);
    try {
      const response = await fetch('/api/user/aliases');
      if (response.ok) {
        const data = await response.json();
        // Filter out the current alias so only previous ones appear
        const previous = (data.aliases as PreviousAlias[]).filter(
          (a) => a.alias !== currentAlias
        );
        setPreviousAliases(previous);
      }
    } catch {
      // silently ignore — dropdown just won't appear
    } finally {
      setIsLoadingAliases(false);
    }
  };

  // Real-time validation with debouncing (only if different from current alias)
  useEffect(() => {
    if (!alias.trim() || alias === currentAlias) {
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
  }, [alias, currentAlias]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
    };
  }, [validationTimer]);

  const handleUpdateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId || !alias.trim() || alias === currentAlias) return;

    setError(null);
    setIsUpdating(true);

    try {
      const success = await updateAliasInContext(alias);

      if (success) {
        onAliasUpdated(alias);
        onClose();
      } else {
        setError('Failed to update alias');
      }
    } catch (error) {
      console.error('Error updating alias:', error);
      setError('Failed to update alias. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSwitchToPrevious = async (previousAlias: string) => {
    setError(null);
    setIsSwitching(true);
    try {
      const result = await switchUserAliasAction(previousAlias);
      if (result.success) {
        await refreshData();
        onAliasUpdated(previousAlias);
        onClose();
      } else {
        setError(result.error || 'Failed to switch alias');
      }
    } catch {
      setError('Failed to switch alias. Please try again.');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleClose = () => {
    setAlias(currentAlias);
    setError(null);
    setValidationMessage(null);
    if (validationTimer) {
      clearTimeout(validationTimer);
    }
    onClose();
  };

  const hasChanges = alias !== currentAlias;
  const isDisabled = isUpdating || isSwitching;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Your Alias"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Update your community alias. This will be displayed on all your shared responses.
        </p>

        {/* Previous aliases dropdown */}
        {!isLoadingAliases && previousAliases.length > 0 && (
          <div className="border-b border-border pb-4">
            <label htmlFor="previous-alias" className="block text-sm font-medium text-card-foreground mb-2">
              Switch to a previous alias
            </label>
            <select
              id="previous-alias"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleSwitchToPrevious(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>Select a previous alias...</option>
              {previousAliases.map((a) => (
                <option key={a.id} value={a.alias}>
                  @{a.alias}
                </option>
              ))}
            </select>
            {isSwitching && (
              <p className="mt-2 text-xs text-muted-foreground">Switching alias...</p>
            )}
          </div>
        )}

        <form onSubmit={handleUpdateAlias} className="space-y-4">
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
                disabled={isDisabled}
              />
            </div>

            {/* Real-time validation feedback */}
            {alias.trim() && hasChanges && (
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
              disabled={isDisabled}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges || !alias.trim() || isDisabled || isValidating || (!!validationMessage && !validationMessage.startsWith('✓'))}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? 'Updating...' : 'Update Alias'}
            </button>
          </div>
        </form>
      </div>
    </FormModal>
  );
}
