'use client';

import React, { useRef, useState } from 'react';
import { PlusIcon, RectangleStackIcon, Bars3CenterLeftIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useIsMobile } from '../hooks/useIsMobile';
import ContentModal from './ui/ContentModal';
import { DojoTipsList, StatsMarkdown } from './ui/ContentModalItems';

interface DojoMenuBarProps {
  onNewReport: () => void;
  onFlashcardMode: () => void;
  flashcardCount: number;
  // Simplified props - only need language and timestamp
  selectedLanguage: string;
  summaryTimestamp: Date | null;
}

export default function DojoMenuBar({ 
  onNewReport, 
  onFlashcardMode, 
  flashcardCount,
  selectedLanguage,
  summaryTimestamp
}: DojoMenuBarProps) {
  const { isMobile } = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Content modal state - managed within DojoMenuBar
  const [contentModalType, setContentModalType] = useState<'tips' | 'stats' | null>(null);

  // Handle content modal types
  const handleContentModal = (type: 'tips' | 'stats') => {
    setContentModalType(type);
  };

  const closeContentModal = () => {
    setContentModalType(null);
  };

  return (
    <>
      <div className="bg-black border-b border-[#222222] px-2 py-2 mx-4 mb-2">
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
              {/* Dojo Tips Button - First */}
              <button
                onClick={() => handleContentModal('tips')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 text-white rounded-sm transition-colors duration-200 whitespace-nowrap"
              >
                <Bars3CenterLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span>dojo tips</span>
              </button>

              {/* Stats Button - Second */}
              <button
                onClick={() => handleContentModal('stats')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 text-white rounded-sm transition-colors duration-200 whitespace-nowrap"
              >
                <ChartBarIcon className="h-4 w-4 flex-shrink-0" />
                <span>stats</span>
              </button>

              {/* New Report Button - Third */}
              <button
                onClick={onNewReport}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 text-white rounded-sm transition-colors duration-200 whitespace-nowrap"
              >
                <PlusIcon className="h-4 w-4 flex-shrink-0" />
                <span>new report</span>
              </button>

              {/* Flashcard Mode Button - Fourth */}
              <button
                onClick={onFlashcardMode}
                disabled={flashcardCount === 0}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-sm transition-colors duration-200 font-mono whitespace-nowrap"
              >
                <RectangleStackIcon className="h-4 w-4 flex-shrink-0" />
                <span>
                  flashcard mode
                  {flashcardCount > 0 && (
                    <span className="ml-1">({flashcardCount})</span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Modals - managed within DojoMenuBar */}
      {/* Tips Modal */}
      <ContentModal
        isOpen={contentModalType === 'tips'}
        onClose={closeContentModal}
        title="Dojo Tips"
        contentComponent={<DojoTipsList />}
      />

      {/* Stats Modal */}
      <ContentModal
        isOpen={contentModalType === 'stats'}
        onClose={closeContentModal}
        title="Response Stats"
        contentComponent={
          <StatsMarkdown 
            selectedLanguage={selectedLanguage}
          />
        }
      />
    </>
  );
} 