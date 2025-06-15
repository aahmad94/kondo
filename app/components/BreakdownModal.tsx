import React from 'react';
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



  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankUpdate(responseId, newRank);
    }
  };

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
          <div className="w-full">
            <StyledMarkdown 
              components={{
                table: ({node, ...props}) => (
                  <table {...props} className="mx-auto" style={{borderSpacing: '0 8px', borderCollapse: 'separate'}} />
                ),
              }}
            >
              {breakdown}
            </StyledMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakdownModal; 