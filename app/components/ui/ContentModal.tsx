'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content?: string;
  /**
   * Pass a ReactNode (e.g., <DojoTipsList />) from ContentModalItems.tsx for custom content
   */
  contentComponent?: React.ReactNode;
}

export default function ContentModal({
  isOpen,
  onClose,
  title = "Content",
  content,
  contentComponent
}: ContentModalProps) {
  // Handle keyboard navigation
  React.useEffect(() => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4">
      <div className="bg-[#111111] rounded-sm w-[90vw] md:w-[600px] max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between py-2 px-4 border-b border-[#222222]">
          <h2 className="text-lg font-medium text-yellow-400">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2 flex justify-center">
            <div className="max-w-none" style={{ color: '#b59f3b' }}>
              {contentComponent ? (
                contentComponent
              ) : content ? (
                <Markdown remarkPlugins={[remarkGfm]}>
                  {content}
                </Markdown>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 