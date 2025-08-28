'use client';

import { Fragment, useRef, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import { useIsMobile } from '../hooks/useIsMobile';
import Tooltip from './Tooltip';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';
import IconButton from './ui/IconButton';
import { StyledMarkdown } from './ui';

interface BreakdownModalDemoProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
  mobileBreakdown?: string;
  rank?: number;
  isPaused?: boolean;
  responseId?: string | null;
  audio?: {
    success: boolean;
    audio: string;
    mimeType: string;
  };
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
}

const BreakdownModalDemo: React.FC<BreakdownModalDemoProps> = ({ 
  isOpen, 
  onClose, 
  breakdown,
  mobileBreakdown,
  rank = 1,
  isPaused = false,
  responseId,
  audio,
  onRankUpdate,
  onPauseToggle
}) => {
  const { isMobile } = useIsMobile();
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);

  // State for view toggle - default based on screen size using mobile detection
  const [isTextView, setIsTextView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'desktop' | 'mobile'>('desktop');
  const [displayedContent, setDisplayedContent] = useState('');

  // Initialize view state based on mobile detection when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsTextView(isMobile);
      // Set initial displayed content
      const initialContent = isMobile ? 
        (mobileBreakdown || breakdown) : 
        (breakdown || mobileBreakdown || '');
      setDisplayedContent(initialContent);
    }
  }, [isOpen, isMobile, breakdown, mobileBreakdown]);

  // Simulate API call for missing breakdown content
  const handleViewToggle = async () => {
    // First, switch the view immediately
    const newIsTextView = !isTextView;
    setIsTextView(newIsTextView);
    
    // Check what content we need for the new view
    const neededContent = newIsTextView ? mobileBreakdown : breakdown;
    
    // If we already have the content, just update display and we're done
    if (neededContent) {
      setDisplayedContent(neededContent);
      return;
    }
    
    // If we don't have the content, simulate generating it
    setIsLoading(true);
    setLoadingType(newIsTextView ? 'mobile' : 'desktop');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate getting new content
    const simulatedContent = newIsTextView ? 
      "**Mobile breakdown content generated**\n\nThis would be the mobile-optimized breakdown..." :
      "| Desktop | Breakdown | Content |\n|---------|-----------|----------|\n| This | would be | desktop table |";
    
    // Set the displayed content directly
    setDisplayedContent(simulatedContent);
    setIsLoading(false);
  };



  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? Math.min(rank + 1, 3) : Math.max(rank - 1, 1);
    await onRankUpdate(responseId, newRank);
  };

  // Loading component with animated dots
  const LoadingContent = ({ type }: { type: 'desktop' | 'mobile' }) => (
    <div className="flex items-center justify-center py-8" style={{ color: 'hsl(var(--phrase-text))' }}>
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-[650px] max-w-[90vw] h-[80vh] transform overflow-hidden rounded-sm bg-card border border-border p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                  {/* Left: action icons */}
                  <div className="flex items-center space-x-3">
                    {/* Rank container */}
                    {responseId && onRankUpdate && (
                      <RankContainer 
                        rank={rank} 
                        onRankClick={onRankClick}
                      />
                    )}

                    {/* Pause/Play button */}
                    {responseId && onPauseToggle && (
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
                      />
                    )}

                    {/* Text to Speech button */}
                    {audio?.success && responseId && (
                      <SpeakerButton
                        responseId={responseId}
                        textToSpeak={displayedContent}
                        selectedLanguage="ja"
                        cachedAudio={audio ? {
                          audio: audio.audio,
                          mimeType: audio.mimeType
                        } : null}
                        buttonRef={speakerButtonRef}
                        onError={(error) => {
                          alert(error);
                        }}
                      />
                    )}
                  </div>
                  {/* Right: X button */}
                  <div>
                    <button
                      type="button"
                      className="text-card-foreground hover:text-muted-foreground transition-colors duration-200"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Breakdown content */}
                <div className="pt-2 flex-1 min-h-0 overflow-hidden">
                  {isLoading ? (
                    <LoadingContent type={loadingType} />
                  ) : (
                    <div className="h-full overflow-y-auto overflow-x-auto">
                      <div className="whitespace-pre-line leading-relaxed flex justify-center" style={{ color: 'hsl(var(--phrase-text))' }}>
                        <div className="w-full">
                          <StyledMarkdown 
                            components={{
                              table: ({ children, ...props }) => (
                                <table {...props} className="mx-auto border-collapse">
                                  {children}
                                </table>
                              )
                            }}
                          >
                            {displayedContent}
                          </StyledMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View Toggle - only show if we have both desktop and mobile breakdown content */}
                {mobileBreakdown && (
                  <div className="flex justify-start pt-4 flex-shrink-0">
                    <button
                      onClick={handleViewToggle}
                      disabled={isLoading}
                      className="font-mono text-xs px-3 py-1.5 bg-secondary hover:bg-accent disabled:bg-muted disabled:opacity-50 rounded-sm text-secondary-foreground hover:text-accent-foreground transition-colors duration-200"
                    >
                      {isLoading 
                        ? `loading ${loadingType === 'mobile' ? 'text' : 'table'} view...`
                        : isTextView ? 'desktop/table view' : 'mobile/list view'
                      }
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BreakdownModalDemo; 