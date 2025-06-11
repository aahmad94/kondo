'use client';

import React from 'react';
import { PlusIcon, RectangleStackIcon } from '@heroicons/react/24/solid';

interface DojoMenuBarProps {
  onNewReport: () => void;
  onFlashcardMode: () => void;
  flashcardCount: number;
}

export default function DojoMenuBar({ onNewReport, onFlashcardMode, flashcardCount }: DojoMenuBarProps) {
  return (
    <div className="bg-black border-b border-[#222222] px-2 py-2 mx-4 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Report Button */}
          <button
            onClick={onNewReport}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 text-white rounded-sm transition-colors duration-200 max-w-[80px] sm:max-w-none"
          >
            <PlusIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate sm:whitespace-normal">new report</span>
          </button>

          {/* Flashcard Mode Button */}
          <button
            onClick={onFlashcardMode}
            disabled={flashcardCount === 0}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-sm transition-colors duration-200 font-mono max-w-[120px] sm:max-w-none"
          >
            <RectangleStackIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate sm:whitespace-normal">
              flashcard mode
              {flashcardCount > 0 && (
                <span className="ml-1">({flashcardCount})</span>
              )}
            </span>
          </button>
        </div>

        {/* Right side - could add more controls here later */}
        <div className="flex items-center gap-2">
          {/* Future: Could add filtering, sorting, or other controls */}
        </div>
      </div>
    </div>
  );
} 