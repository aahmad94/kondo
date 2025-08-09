'use client';

import React, { useRef, useState } from 'react';
import { PlusIcon, RectangleStackIcon, Bars3CenterLeftIcon, ChartBarIcon, CommandLineIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { useIsMobile } from '../hooks/useIsMobile';
import ContentModal from './ui/ContentModal';
import ConfirmationModal from './ui/ConfirmationModal';
import { DojoTipsList, StatsContent, AdditionalCommands } from './ui/ContentModalItems';
import EmailSubscriptionModal from './EmailSubscriptionModal';

interface ChatBoxMenuBarProps {
  onNewReport: () => void;
  onFlashcardMode: () => void;
  flashcardCount: number;
  selectedLanguage: string;
  summaryTimestamp: Date | null;
  selectedBookmark: { id: string | null, title: string | null };
  isFlashcardModalOpen?: boolean;
}

export default function ChatBoxMenuBar({ 
  onNewReport, 
  onFlashcardMode, 
  flashcardCount,
  selectedLanguage,
  summaryTimestamp,
  selectedBookmark,
  isFlashcardModalOpen = false
}: ChatBoxMenuBarProps) {
  const { isMobile } = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Content modal state - managed within ChatBoxMenuBar
  const [contentModalType, setContentModalType] = useState<'tips' | 'stats' | 'commands' | null>(null);
  
  // New report confirmation modal state
  const [showNewReportConfirmation, setShowNewReportConfirmation] = useState(false);
  
  // Email subscription modal state
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Handle content modal types
  const handleContentModal = (type: 'tips' | 'stats' | 'commands', event?: React.MouseEvent<HTMLButtonElement>) => {
    if (type === 'commands' && event) {
      // Remove glow effect after first click
      const button = event.currentTarget;
      button.classList.remove('button-glow');
      button.classList.add('bg-card');
    }
    setContentModalType(type);
  };

  const closeContentModal = () => {
    setContentModalType(null);
  };
  
  // Handle new report confirmation
  const handleNewReportClick = () => {
    setShowNewReportConfirmation(true);
  };
  
  const handleNewReportConfirm = () => {
    setShowNewReportConfirmation(false);
    onNewReport();
  };
  
  const handleNewReportCancel = () => {
    setShowNewReportConfirmation(false);
  };
  
  // Handle email modal
  const handleEmailModalOpen = () => {
    setShowEmailModal(true);
  };
  
  const handleEmailModalClose = () => {
    setShowEmailModal(false);
  };

  // Handle flashcard mode with click tracking
  const handleFlashcardClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Remove glow effect after first click
    const button = event.currentTarget;
    button.classList.remove('button-glow');
    button.classList.add('bg-card');
    onFlashcardMode();
  };

  // Determine which buttons to show based on selected bookmark
  const isDojo = selectedBookmark.title === 'daily summary';
  const isRoot = selectedBookmark.id === null && selectedBookmark.title === null;
  const isOtherBookmark = !isRoot && !isDojo; // Regular bookmarks and other reserved bookmarks
  
  const showFlashcards = isDojo || isOtherBookmark;
  const showDojoTips = isDojo;
  const showNewReport = isDojo;
  const showEmailSubscription = isDojo; // Only show email button in Dojo
  const showAdditionalCommands = isRoot;
  const showStats = true; // Show stats for all bookmark types

  return (
    <>
      <div className="bg-background border-b border-border px-2 py-2 mx-4 mb-2">
        <div className="flex items-center">
          {/* Scrollable buttons container */}
          <div 
            ref={scrollContainerRef}
            className={`flex items-center gap-2 sm:gap-3 ${
              isMobile ? 'overflow-x-auto scrollbar-hide' : ''
            } flex-1 min-w-0`}
            style={{
              // Hide scrollbar but enable scrolling on mobile
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* New Report Button - First */}
              {showNewReport && (
                <button
                  onClick={handleNewReportClick}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4 flex-shrink-0" />
                  <span>new report</span>
                </button>
              )}

              {/* Flashcard Mode Button - Second */}
              {showFlashcards && (
                <button
                  onClick={handleFlashcardClick}
                  disabled={flashcardCount === 0}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm button-glow hover:bg-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 font-mono whitespace-nowrap"
                >
                  <RectangleStackIcon className="h-4 w-4 flex-shrink-0" />
                  <span>
                    flashcard mode
                    {flashcardCount > 0 && (
                      <span className="ml-1">({flashcardCount})</span>
                    )}
                  </span>
                </button>
              )}

              {/* Email Subscription Button - Third (dojo only) */}
              {showEmailSubscription && (
                <button
                  onClick={handleEmailModalOpen}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                  <span>email updates</span>
                </button>
              )}

              {/* Additional Commands Button - Fourth (root only) */}
              {showAdditionalCommands && (
                <button
                  onClick={(e) => handleContentModal('commands', e)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm button-glow hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <CommandLineIcon className="h-4 w-4 flex-shrink-0" />
                  <span>commands</span>
                </button>
              )}

              {/* Dojo Tips Button - Second to Last */}
              {showDojoTips && (
                <button
                  onClick={() => handleContentModal('tips')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <Bars3CenterLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>dojo tips</span>
                </button>
              )}

              {/* Stats Button - Last */}
              {showStats && (
                <button
                  onClick={() => handleContentModal('stats')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <ChartBarIcon className="h-4 w-4 flex-shrink-0" />
                  <span>stats</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Modals - managed within ChatBoxMenuBar */}
      {/* Tips Modal */}
      <ContentModal
        isOpen={contentModalType === 'tips'}
        onClose={closeContentModal}
        title="Dojo Tips"
        contentComponent={<DojoTipsList />}
      />

      {/* Additional Commands Modal */}
      <ContentModal
        isOpen={contentModalType === 'commands'}
        onClose={closeContentModal}
        title="Additional Commands"
        contentComponent={
          <AdditionalCommands 
            selectedLanguage={selectedLanguage}
          />
        }
      />

      {/* Stats Modal */}
      <ContentModal
        isOpen={contentModalType === 'stats'}
        onClose={closeContentModal}
        title="Response Stats"
        contentComponent={
          <StatsContent 
            selectedLanguage={selectedLanguage}
          />
        }
      />
      
      {/* New Report Confirmation Modal */}
      <ConfirmationModal
        isOpen={showNewReportConfirmation}
        onClose={handleNewReportCancel}
        onConfirm={handleNewReportConfirm}
        title="Create New Report"
        message="Are you sure you would like to create a new dojo report?"
        confirmText="Yes"
        cancelText="Cancel"
        confirmButtonColor="blue"
      />

      {/* Email Subscription Modal */}
      <EmailSubscriptionModal
        isOpen={showEmailModal}
        onClose={handleEmailModalClose}
        selectedLanguage={selectedLanguage}
      />
    </>
  );
} 