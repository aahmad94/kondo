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

  // Initialize view state based on mobile detection when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsTextView(isMobile);
    }
  }, [isOpen, isMobile]);

  // Simulate API call for missing breakdown content
  const handleViewToggle = async () => {
    const newIsTextView = !isTextView;
    
    // Check if we need to "generate" the content (simulate missing content)
    // If switching to text view, check if we have mobile breakdown
    // If switching to table view, check if we have desktop breakdown AND if it's different from mobile
    let needsGeneration = false;
    
    if (newIsTextView) {
      // Switching to text view - need mobile breakdown
      needsGeneration = !mobileBreakdown;
    } else {
      // Switching to table view - need desktop breakdown
      // Also check if desktop and mobile breakdowns are the same (which means we need to generate a proper desktop one)
      needsGeneration = !breakdown || 
                       (!!mobileBreakdown && breakdown === mobileBreakdown);
    }
    
    console.log('Demo Toggle Debug:', {
      newIsTextView,
      needsGeneration,
      hasDesktop: !!breakdown,
      hasMobile: !!mobileBreakdown,
      areEqual: breakdown === mobileBreakdown
    });
    
    if (needsGeneration) {
      setIsLoading(true);
      setLoadingType(newIsTextView ? 'mobile' : 'desktop');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsLoading(false);
    }
    
    setIsTextView(newIsTextView);
  };

  // Determine which breakdown to display based on toggle state
  const currentBreakdown = isTextView ? 
    (mobileBreakdown || breakdown) : 
    (breakdown || mobileBreakdown);

  // Ensure we always have a string
  const displayBreakdown = currentBreakdown || '';

  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? Math.min(rank + 1, 3) : Math.max(rank - 1, 1);
    await onRankUpdate(responseId, newRank);
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

  console.log('----------- Demo Debug Info -----------');
  console.log('isTextView:', isTextView);
  console.log('isMobile:', isMobile);
  console.log('breakdown length:', breakdown?.length || 0);
  console.log('mobileBreakdown length:', mobileBreakdown?.length || 0);
  console.log('displayBreakdown length:', displayBreakdown.length);

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-[650px] max-w-[90vw] transform overflow-visible rounded-sm bg-[#111111] p-6 text-left align-middle shadow-xl transition-all flex flex-col max-h-[80vh]">
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
                        textToSpeak={displayBreakdown}
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
                      className="text-white hover:opacity-70 transition-opacity duration-200"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Breakdown content */}
                <div className="pt-2 flex-1 overflow-hidden">
                  {isLoading ? (
                    <LoadingContent type={loadingType} />
                  ) : (
                    <div className="text-white whitespace-pre-line leading-relaxed overflow-y-auto overflow-x-auto max-h-full flex justify-center" style={{ color: '#b59f3b' }}>
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
                          {displayBreakdown}
                        </StyledMarkdown>
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
                      className="font-mono text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded-sm text-white transition-colors duration-200"
                    >
                      {isLoading 
                        ? `loading ${loadingType === 'mobile' ? 'text' : 'table'} view...`
                        : isTextView ? 'table view' : 'text view'
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