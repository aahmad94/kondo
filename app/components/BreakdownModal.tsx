import React from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, PlayCircleIcon, PauseCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Tooltip from './Tooltip';
import { useIsMobile } from '../hooks/useIsMobile';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
  rank?: number;
  isPaused?: boolean;
  responseId?: string | null;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onTextToSpeech?: () => Promise<void>;
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
  onTextToSpeech
}) => {
  const red = '#d93900'
  const yellow = '#b59f3b'
  const green = '#2ea149'
  const [rankContainerOutline, setRankContainerOutline] = React.useState(red);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isSpeakerHovered, setIsSpeakerHovered] = React.useState(false);
  const [isUpChevronHovered, setIsUpChevronHovered] = React.useState(false);
  const [isDownChevronHovered, setIsDownChevronHovered] = React.useState(false);
  const pauseButtonRef = React.useRef<HTMLButtonElement>(null);
  const speakerButtonRef = React.useRef<HTMLButtonElement>(null);
  const upChevronRef = React.useRef<HTMLButtonElement>(null);
  const downChevronRef = React.useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (rank === 1) {
      setRankContainerOutline(red);
    } else if (rank === 2) {
      setRankContainerOutline(yellow);
    } else if (rank === 3) {
      setRankContainerOutline(green);
    }
  }, [rank]);

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
      <div className="bg-[#111111] p-6 rounded-sm w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center sticky top-0 bg-[#111111] pb-4">
          <h2 className="text-l font-bold" style={{ color: '#b59f3b' }}>Breakdown</h2>
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="text-[#b59f3b] whitespace-pre-wrap overflow-y-auto">
          <Markdown remarkPlugins={[remarkGfm]} className="overflow-hidden">
            {breakdown}
          </Markdown>
        </div>

      {/* Bottom action buttons */}
        <div className="flex items-center gap-3 mt-3 pt-2">
          {/* Rank container */}
          { responseId && !responseId.startsWith('temp_') && onRankUpdate && (
            <div
              className={"rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"}
              style={{
                border: `3px solid ${rankContainerOutline}`,
                backgroundColor: '#111111'
              }}
            >
              {!isMobile ? (
                <Tooltip
                  content="Rank higher to surface less"
                  isVisible={isUpChevronHovered}
                  buttonRef={upChevronRef}
                >
                  <button
                    ref={upChevronRef}
                    onClick={() => onRankClick(true)}
                    disabled={rank >= 3}
                    className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    onMouseEnter={() => setIsUpChevronHovered(true)}
                    onMouseLeave={() => setIsUpChevronHovered(false)}
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>
                </Tooltip>
              ) : (
                <button
                  ref={upChevronRef}
                  onClick={() => onRankClick(true)}
                  disabled={rank >= 3}
                  className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                >
                  <ChevronUpIcon className="h-5 w-5" />
                </button>
              )}
              <span className={`px-1.5 rounded text-xs text-white`}>
                {rank}
              </span>
              {!isMobile ? (
                <Tooltip
                  content="Rank lower to surface more"
                  isVisible={isDownChevronHovered}
                  buttonRef={downChevronRef}
                >
                  <button
                    ref={downChevronRef}
                    onClick={() => onRankClick(false)}
                    disabled={rank <= 1}
                    className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                    onMouseEnter={() => setIsDownChevronHovered(true)}
                    onMouseLeave={() => setIsDownChevronHovered(false)}
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </button>
                </Tooltip>
              ) : (
                <button
                  ref={downChevronRef}
                  onClick={() => onRankClick(false)}
                  disabled={rank <= 1}
                  className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
              )}
            </div>
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

          {/* Text-to-speech button */}
          {onTextToSpeech && (
            !isMobile ? (
              <Tooltip
                content="Listen to pronunciation"
                isVisible={isSpeakerHovered}
                buttonRef={speakerButtonRef}
              >
                <button 
                  ref={speakerButtonRef}
                  onClick={onTextToSpeech}
                  onMouseEnter={() => setIsSpeakerHovered(true)}
                  onMouseLeave={() => setIsSpeakerHovered(false)}
                  className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
                >
                  <SpeakerWaveIcon className="h-6 w-6" />
                </button>
              </Tooltip>
            ) : (
              <button 
                ref={speakerButtonRef}
                onClick={onTextToSpeech}
                className="text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group"
              >
                <SpeakerWaveIcon className="h-6 w-6" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakdownModal; 