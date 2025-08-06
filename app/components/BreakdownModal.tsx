import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import Tooltip from './Tooltip';
import { useIsMobile } from '../hooks/useIsMobile';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';
import IconButton from './ui/IconButton';
import { StyledMarkdown } from './ui';
import { prepareTextForSpeech } from '@/lib';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading: boolean;
  isTextView: boolean;
  canToggle: boolean;
  originalResponse?: string;
  rank?: number;
  isPaused?: boolean;
  responseId?: string | null;
  selectedBookmarkTitle?: string | null;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  selectedLanguage?: string;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: string) => void;
  onToggleView?: (toTextView: boolean) => void;
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ 
  isOpen, 
  onClose, 
  content,
  isLoading,
  isTextView,
  canToggle,
  originalResponse,
  rank = 1,
  isPaused = false,
  responseId,
  selectedBookmarkTitle,
  onRankUpdate,
  onPauseToggle,
  selectedLanguage = 'ja',
  onLoadingChange,
  onError,
  onToggleView
}) => {
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);

  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankUpdate(responseId, newRank);
    }
  };

  const handleToggleView = () => {
    if (onToggleView) {
      onToggleView(!isTextView);
    }
  };

  // Loading component with animated dots
  const LoadingContent = ({ type }: { type: 'desktop' | 'mobile' }) => (
    <div className="flex items-center justify-center py-8" style={{ color: 'hsl(var(--phrase-text))' }}>
      <span className="font-mono">loading {type} view</span>
      <span className="dots-animation">
        <style jsx>{`
          .dots-animation::after {
            content: '';
            animation: dots 1.5s steps(4, end) infinite;
          }
          
          @keyframes dots {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60% { content: '...'; }
            80%, 100% { content: ''; }
          }
        `}</style>
      </span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[80]">
      <div className="bg-card border border-border p-6 rounded-sm w-[650px] max-w-[90vw] max-h-[80vh] min-h-[30vh] flex flex-col">
        <div className="flex justify-between items-center bg-card pb-4 flex-shrink-0">
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* Rank container */}
            { responseId && !responseId.startsWith('temp_') && onRankUpdate && (
              <RankContainer 
                rank={rank} 
                onRankClick={onRankClick}
              />
            )}

            {/* Pause button - only show when selected bookmark is Daily Summary */}
            {responseId && !responseId.startsWith('temp_') && onPauseToggle && selectedBookmarkTitle === 'daily summary' && (
              <IconButton
                icon={<PauseCircleIcon className="h-6 w-6" />}
                alternateIcon={<PlayCircleIcon className="h-6 w-6" />}
                isAlternateState={isPaused}
                onClick={() => onPauseToggle(responseId, !isPaused)}
                tooltipContent={{
                  default: "Pause cycling this response in dojo",
                  alternate: "Resume cycling this response in dojo"
                }}
                buttonRef={pauseButtonRef}
                colorScheme="green-yellow"
                className="relative group"
              />
            )}

            {/* Speaker button */}
            {responseId && content && originalResponse && (
              <SpeakerButton
                responseId={responseId}
                textToSpeak={prepareTextForSpeech(originalResponse)}
                selectedLanguage={selectedLanguage}
                tooltipContent="Listen to breakdown"
                buttonRef={speakerButtonRef}
                onLoadingChange={onLoadingChange}
                onError={onError}
              />
            )}
          </div>
          <button onClick={onClose} className="text-card-foreground hover:text-muted-foreground transition-colors duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="whitespace-pre-wrap overflow-y-auto overflow-x-auto flex justify-center flex-1" style={{ color: 'hsl(var(--phrase-text))' }}>
          {isLoading ? (
            <LoadingContent type={isTextView ? 'mobile' : 'desktop'} />
          ) : (
            <div className="w-full">
              <StyledMarkdown 
                components={{
                  table: ({node, ...props}) => (
                    <table {...props} className="mx-auto" style={{borderSpacing: '0 8px', borderCollapse: 'separate'}} />
                  ),
                }}
              >
                {content}
              </StyledMarkdown>
            </div>
          )}
        </div>

        {/* View Toggle - only show if toggle is available */}
        {canToggle && (
          <div className="flex justify-start pt-4 flex-shrink-0">
            {!isLoading && 
              <button
                onClick={handleToggleView}
                disabled={isLoading}
                className="font-mono text-xs px-3 py-1.5 bg-secondary hover:bg-accent disabled:bg-muted disabled:opacity-50 rounded-sm text-secondary-foreground hover:text-accent-foreground transition-colors duration-200"
              >
                {isTextView ? 'desktop/table view' : 'mobile/list view'}
              </button>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default BreakdownModal; 