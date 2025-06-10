import React from 'react';
import { XMarkIcon, PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Tooltip from './Tooltip';
import { useIsMobile } from '../hooks/useIsMobile';
import RankContainer from './ui/RankContainer';
import SpeakerButton from './ui/SpeakerButton';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
  rank?: number;
  isPaused?: boolean;
  responseId?: string | null;
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
  rank = 1,
  isPaused = false,
  responseId,
  onRankUpdate,
  onPauseToggle,
  selectedLanguage = 'ja',
  onLoadingChange,
  onError
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-[#111111] p-6 rounded-sm w-[650px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center sticky top-0 bg-[#111111] pb-4">
          {/* Action buttons (formerly bottom) */}
          <div className="flex items-center gap-3">
            {/* Rank container */}
            { responseId && !responseId.startsWith('temp_') && onRankUpdate && (
              <RankContainer 
                rank={rank} 
                onRankClick={onRankClick}
              />
            )}

            {/* Pause button */}
            {responseId && !responseId.startsWith('temp_') && onPauseToggle && (
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
                    onClick={() => onPauseToggle(responseId, !isPaused)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`relative group ${isPaused ? 'text-green-500 hover:text-green-700' : 'text-yellow-500 hover:text-yellow-700'} transition-colors duration-200`}
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
                  onClick={() => onPauseToggle(responseId, !isPaused)}
                  className={`relative group ${isPaused ? 'text-green-500 hover:text-green-700' : 'text-yellow-500 hover:text-yellow-700'} transition-colors duration-200`}
                >
                  {isPaused ? (
                    <PlayCircleIcon className="h-6 w-6" />
                  ) : (
                    <PauseCircleIcon className="h-6 w-6" />
                  )}
                </button>
              )
            )}

            {/* Speaker button */}
            {responseId && breakdown && (
              <SpeakerButton
                responseId={responseId}
                textToSpeak={breakdown}
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
        <div className="text-[#b59f3b] whitespace-pre-wrap overflow-y-auto overflow-x-auto flex justify-center">
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
    </div>
  );
};

export default BreakdownModal; 