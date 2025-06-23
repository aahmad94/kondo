import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import Tooltip from './Tooltip';
import { useIsMobile } from '../hooks/useIsMobile';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';
import IconButton from './ui/IconButton';
import { StyledMarkdown } from './ui';
import { prepareTextForSpeech } from '../../lib/audioUtils';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
  mobileBreakdown?: string;
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
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ 
  isOpen, 
  onClose, 
  breakdown,
  mobileBreakdown,
  originalResponse,
  rank = 1,
  isPaused = false,
  responseId,
  selectedBookmarkTitle,
  onRankUpdate,
  onPauseToggle,
  selectedLanguage = 'ja',
  onLoadingChange,
  onError
}) => {
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);
  const { isMobile, offset } = useIsMobile();

  // State for view toggle - default based on screen size using mobile detection
  const [isTextView, setIsTextView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'desktop' | 'mobile'>('desktop');
  const [cachedDesktopBreakdown, setCachedDesktopBreakdown] = useState(breakdown);
  const [cachedMobileBreakdown, setCachedMobileBreakdown] = useState(mobileBreakdown || '');

  // Initialize view state based on mobile detection when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsTextView(isMobile);
    }
  }, [isOpen, isMobile]);

  // Handle API call for missing breakdown content
  const handleViewToggle = async () => {
    const newIsTextView = !isTextView;
    
    // Check if we need to generate the content
    const needsGeneration = newIsTextView ? !cachedMobileBreakdown : !cachedDesktopBreakdown;
    
    if (needsGeneration && originalResponse && responseId) {
      setIsLoading(true);
      setLoadingType(newIsTextView ? 'mobile' : 'desktop');
      
      try {
        onLoadingChange?.(true);
        
        const res = await fetch('/api/breakdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: originalResponse,
            language: selectedLanguage,
            responseId: responseId,
            isMobile: newIsTextView
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to generate breakdown');
        }

        const data = await res.json();
        
        // Cache the breakdown
        if (newIsTextView) {
          setCachedMobileBreakdown(data.breakdown);
        } else {
          setCachedDesktopBreakdown(data.breakdown);
        }
        
      } catch (error: any) {
        onError?.(error.message || 'Failed to generate breakdown');
        return; // Don't change view if there was an error
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
    
    setIsTextView(newIsTextView);
  };

  // Determine which breakdown to display based on toggle state
  const currentBreakdown = isTextView && cachedMobileBreakdown ? cachedMobileBreakdown : cachedDesktopBreakdown;

  console.log('----------- breakdown -----------');
  console.log(breakdown);

  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankUpdate(responseId, newRank);
    }
  };

  // Loading component with animated dots
  const LoadingContent = ({ type }: { type: 'desktop' | 'mobile' }) => (
    <div className="flex items-center justify-center py-8" style={{ color: '#b59f3b' }}>
      <span className="font-mono">generating {type} breakdown</span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[80]">
      <div className="bg-[#111111] p-6 rounded-sm w-[650px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center bg-[#111111] pb-4 flex-shrink-0">
          {/* Action buttons (formerly bottom) */}
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
            {responseId && breakdown && originalResponse && (
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
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="text-[#b59f3b] whitespace-pre-wrap overflow-y-auto overflow-x-auto flex justify-center flex-1">
          {isLoading ? (
            <LoadingContent type={loadingType} />
          ) : (
            <div className="w-full">
              <StyledMarkdown 
                components={{
                  table: ({node, ...props}) => (
                    <table {...props} className="mx-auto" style={{borderSpacing: '0 8px', borderCollapse: 'separate'}} />
                  ),
                }}
              >
                {currentBreakdown}
              </StyledMarkdown>
            </div>
          )}
        </div>

        {/* View Toggle - only show if we have mobile breakdown capability */}
        {(cachedMobileBreakdown || originalResponse) && (
          <div className="flex justify-start pt-4 flex-shrink-0">
            <button
              onClick={handleViewToggle}
              disabled={isLoading}
              className="font-mono text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded-sm text-white transition-colors duration-200"
            >
              {isLoading 
                ? `loading ${loadingType === 'mobile' ? 'text' : 'table'} view...`
                : isTextView ? 'table view' : 'text view'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreakdownModal; 