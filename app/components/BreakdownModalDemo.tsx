'use client';

import { Fragment, useRef, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useIsMobile } from '../hooks/useIsMobile';
import Tooltip from './Tooltip';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';

interface BreakdownModalDemoProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
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
  rank = 1,
  isPaused = false,
  responseId,
  audio,
  onRankUpdate,
  onPauseToggle
}) => {
  const { isMobile } = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);



  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? Math.min(rank + 1, 3) : Math.max(rank - 1, 1);
    await onRankUpdate(responseId, newRank);
  };

  const handlePauseToggle = async () => {
    if (!responseId || !onPauseToggle) return;
    
    await onPauseToggle(responseId, !isPaused);
  };



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
              <Dialog.Panel className="w-[650px] max-w-[90vw] transform overflow-visible rounded-sm bg-[#111111] p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
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
                      !isMobile ? (
                        <Tooltip
                          content={isPaused 
                            ? "Resume cycling this response in dojo" 
                            : "Pause cycling this response in dojo"
                          }
                          isVisible={isHovered}
                          buttonRef={pauseButtonRef}
                        >
                          <button
                            ref={pauseButtonRef}
                            onClick={handlePauseToggle}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            className={`transition-colors duration-200 ${
                              isPaused 
                                ? 'text-green-500 hover:text-green-700' 
                                : 'text-yellow-500 hover:text-yellow-700'
                            }`}
                          >
                            {isPaused ? (
                              <PlayCircleIcon className="h-6 w-6" />
                            ) : (
                              <PauseCircleIcon className="h-6 w-6" />
                            )}
                          </button>
                        </Tooltip>
                      ) : (
                        <button
                          ref={pauseButtonRef}
                          onClick={handlePauseToggle}
                          className={`transition-colors duration-200 ${
                            isPaused 
                              ? 'text-green-500 hover:text-green-700' 
                              : 'text-yellow-500 hover:text-yellow-700'
                          }`}
                        >
                          {isPaused ? (
                            <PlayCircleIcon className="h-6 w-6" />
                          ) : (
                            <PauseCircleIcon className="h-6 w-6" />
                          )}
                        </button>
                      )
                    )}

                    {/* Text to Speech button */}
                    {audio?.success && responseId && (
                      <SpeakerButton
                        responseId={responseId}
                        textToSpeak={breakdown}
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
                <div className="pt-2">
                  <div className="text-white whitespace-pre-line leading-relaxed overflow-y-auto overflow-x-auto max-h-96 flex justify-center" style={{ color: '#b59f3b' }}>
                    <div className="w-full">
                      <Markdown remarkPlugins={[remarkGfm]} components={{
                        table: ({ children, ...props }) => (
                          <table {...props} className="mx-auto border-collapse">
                            {children}
                          </table>
                        )
                      }}>
                        {breakdown}
                      </Markdown>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BreakdownModalDemo; 