'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { updateUserLandingPageAction } from '@/actions/landingPage';
import type { LandingPage } from '@/lib/user';
import { LoadingDots } from './ui';

interface LandingPageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANDING_PAGE_OPTIONS: { value: LandingPage; label: string }[] = [
  { value: 'create', label: 'Create' },
  { value: 'dojo', label: 'Dojo' },
  { value: 'community', label: 'Community' },
];

export default function LandingPageModal({ isOpen, onClose }: LandingPageModalProps) {
  const [landingPage, setLandingPage] = useState<LandingPage>('community');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      setIsLoading(true);
      fetch('/api/landingPage')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then((data) => {
          if (data.landingPage && ['create', 'dojo', 'community'].includes(data.landingPage)) {
            setLandingPage(data.landingPage as LandingPage);
          }
        })
        .catch(() => setLandingPage('community'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    const result = await updateUserLandingPageAction(landingPage);
    setIsSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Landing page updated.' });
      setTimeout(() => {
        onClose();
      }, 600);
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to update.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-card border border-border rounded-sm w-[90vw] md:w-[400px] max-h-[90vh] flex flex-col relative">
        <div className="flex items-center justify-between py-2 px-4 border-b border-border">
          <h2 className="text-lg font-medium text-primary">Landing page</h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-card-foreground transition-colors duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground py-2">
            Choose which view opens when you visit Kondo
          </p>
          {isLoading ? (
            <LoadingDots className="py-4 text-center text-muted-foreground" />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="landing-page-select" className="text-sm font-medium text-card-foreground">
                  Select the default landing page
                </label>
                <select
                  id="landing-page-select"
                  value={landingPage}
                  onChange={(e) => setLandingPage(e.target.value as LandingPage)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LANDING_PAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {message && (
                <p
                  className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                >
                  {message.text}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground hover:bg-accent rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
