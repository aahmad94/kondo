'use client';

import React, { useRef, useState } from 'react';
import { WrenchIcon, PlusIcon, RectangleStackIcon, Bars3CenterLeftIcon, ChartBarIcon, CommandLineIcon, EnvelopeIcon, ArrowDownTrayIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import { useIsMobile } from '../hooks/useIsMobile';
import ContentModal from './ui/ContentModal';
import ConfirmationModal from './ui/ConfirmationModal';
import { DojoTipsList, StatsContent, AdditionalCommands, CommunityInstructions, CreateInstructions } from './ui/ContentModalItems';
import EmailSubscriptionModal from './EmailSubscriptionModal';

interface ChatBoxMenuBarProps {
  onNewReport: () => void;
  onFlashcardMode: () => void;
  flashcardCount: number;
  selectedLanguage: string;
  summaryTimestamp: Date | null;
  selectedDeck: { id: string | null, title: string | null };
  isFlashcardModalOpen?: boolean;
  onCreateNewContent: () => void;
  communityFilters?: { deckTitle?: string };
  onImportEntireBookmark?: () => void;
  onDeckSelect?: (id: string | null, title: string | null) => void;
}

export default function ChatBoxMenuBar({ 
  onCreateNewContent,
  onNewReport, 
  onFlashcardMode, 
  flashcardCount,
  selectedLanguage,
  summaryTimestamp,
  selectedDeck,
  isFlashcardModalOpen = false,
  communityFilters,
  onImportEntireBookmark,
  onDeckSelect
}: ChatBoxMenuBarProps) {
  const { isMobile } = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Content modal state - managed within ChatBoxMenuBar
  const [contentModalType, setContentModalType] = useState<'tips' | 'stats' | 'commands' | 'community' | 'create' | null>(null);
  
  // New report confirmation modal state
  const [showNewReportConfirmation, setShowNewReportConfirmation] = useState(false);
  
  // Email subscription modal state
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Handle content modal types
  const handleContentModal = (type: 'tips' | 'stats' | 'commands' | 'community' | 'create', event?: React.MouseEvent<HTMLButtonElement>) => {
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

  // Handle Dojo button click
  const handleDojoClick = () => {
    if (onDeckSelect) {
      // Find the daily summary deck and select it
      onDeckSelect(null, 'daily summary');
    }
  };


  // Determine which buttons to show based on selected deck
  const isDojo = selectedDeck.title === 'daily summary';
  const isCommunity = selectedDeck.title === 'community';
  const isRoot = selectedDeck.id === null && selectedDeck.title === null;
  const isOtherBookmark = !isRoot && !isDojo && !isCommunity; // Regular decks and other reserved decks
  
  // Check if we have a specific deck selected in community mode
  const isCommunityWithSelectedBookmark = isCommunity && communityFilters?.deckTitle;
  
  const showFlashcards = isDojo || isOtherBookmark; // Exclude community from flashcards
  const showDojoTips = isDojo;
  const showCommunityInstructions = isCommunity;
  const showCreateInstructions = isRoot; // Show instructions when in create view (root)
  const showNewReport = isDojo;
  const showEmailSubscription = isDojo; // Only show email button in Dojo
  const showAdditionalCommands = isRoot;
  const showStats = !isCommunity; // Hide stats in community mode
  const showImportEntireBookmark = isCommunityWithSelectedBookmark && onImportEntireBookmark;

  return (
    <>
      <div className="bg-background border-b border-border py-2 mb-2">
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
            <div className="flex items-center px-4 mx-4 gap-2 sm:gap-3 flex-shrink-0">
              {/* Import Entire Bookmark Button - 1st (Community with selected deck only) */}
              {showImportEntireBookmark && (
                <button
                  onClick={onImportEntireBookmark}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-purple-400 hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 flex-shrink-0 text-purple-400" />
                  <span>import entire deck</span>
                </button>
              )}

              {/* Create Button - 2nd */}
              {isCommunity && isMobile && (
                <button
                  onClick={onCreateNewContent}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <WrenchIcon className="h-4 w-4 flex-shrink-0" />
                  <span>create</span>
                </button>
              )}

              {/* Dojo Button - 3rd */}
              {isCommunity && isMobile && onDeckSelect && (
                <button
                  onClick={handleDojoClick}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <AcademicCapIcon className="h-4 w-4 flex-shrink-0" />
                  <span>dojo</span>
                </button>
              )}

              {/* Flashcard Mode Button - Fourth */}
              {showFlashcards && (
                <button
                  onClick={onFlashcardMode}
                  disabled={flashcardCount === 0}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-phrase-text hover:text-primary-foreground rounded-sm transition-colors duration-200 font-mono whitespace-nowrap"
                >
                  <RectangleStackIcon className="h-4 w-4 flex-shrink-0 text-phrase-text" />
                  <span>
                    flashcard mode
                    {flashcardCount > 0 && (
                      <span className="ml-1">({flashcardCount})</span>
                    )}
                  </span>
                </button>
              )}

              {/* Generate New Report Button - Fourth (dojo only) */}
                            {showNewReport && (
                <button
                  onClick={handleNewReportClick}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <PlusIcon className="h-4 w-4 flex-shrink-0" />
                  <span>generate new report</span>
                </button>
              )}

              {/* Email Subscription Button - Fifth (dojo only) */}
              {showEmailSubscription && (
                <button
                  onClick={handleEmailModalOpen}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                  <span>email updates</span>
                </button>
              )}

              {/* Additional Commands Button - Sixth (root only) */}
              {showAdditionalCommands && (
                <button
                  onClick={(e) => handleContentModal('commands', e)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <CommandLineIcon className="h-4 w-4 flex-shrink-0" />
                  <span>commands</span>
                </button>
              )}

              {/* Create Instructions Button - Seventh (root only) */}
              {showCreateInstructions && (
                <button
                  onClick={() => handleContentModal('create')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <Bars3CenterLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>instructions</span>
                </button>
              )}

              {/* Dojo Tips Button - Eighth */}
              {showDojoTips && (
                <button
                  onClick={() => handleContentModal('tips')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <Bars3CenterLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>dojo tips</span>
                </button>
              )}

              {/* Community Instructions Button - Eighth */}
              {showCommunityInstructions && (
                <button
                  onClick={() => handleContentModal('community')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-card hover:bg-primary text-card-foreground hover:text-primary-foreground rounded-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <Bars3CenterLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>instructions</span>
                </button>
              )}

              {/* Stats Button - Ninth */}
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

      {/* Community Instructions Modal */}
      <ContentModal
        isOpen={contentModalType === 'community'}
        onClose={closeContentModal}
        title="Community Feed Instructions"
        contentComponent={<CommunityInstructions />}
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

      {/* Create Instructions Modal */}
      <ContentModal
        isOpen={contentModalType === 'create'}
        onClose={closeContentModal}
        title="Create Instructions"
        contentComponent={<CreateInstructions />}
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