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
    <div className="sticky top-0 z-10 bg-black border-b border-[#222222] px-3 py-2 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* New Report Button */}
          <button
            onClick={onNewReport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 text-white rounded transition-colors duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            new report
          </button>

          {/* Flashcard Mode Button */}
          <button
            onClick={onFlashcardMode}
            disabled={flashcardCount === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-900 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors duration-200 font-mono"
          >
            <RectangleStackIcon className="h-4 w-4" />
            flashcard mode
            {flashcardCount > 0 && (
              <span>({flashcardCount})</span>
            )}
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