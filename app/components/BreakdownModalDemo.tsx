'use client';

import { Fragment, useRef, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, PlayCircleIcon, PauseCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle rank color changes based on rank value
  const getRankBorderColor = (rank: number) => {
    if (rank === 1) return '#d93900'; // red
    if (rank === 2) return '#b59f3b'; // yellow
    if (rank === 3) return '#2ea149'; // green
    return '#666666';
  };

  const onRankClick = async (increment: boolean) => {
    if (!responseId || !onRankUpdate) return;
    
    const newRank = increment ? Math.min(rank + 1, 3) : Math.max(rank - 1, 1);
    await onRankUpdate(responseId, newRank);
  };

  const handlePauseToggle = async () => {
    if (!responseId || !onPauseToggle) return;
    
    await onPauseToggle(responseId, !isPaused);
  };

  const handleTextToSpeech = async () => {
    if (!audio || !audio.success) {
      alert('Audio not available for this demo response');
      return;
    }

    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Convert base64 audio to blob and create URL
      const audioBlob = new Blob(
        [Buffer.from(audio.audio, 'base64')],
        { type: audio.mimeType }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;

      await audioRef.current.play();
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        alert('Error playing audio');
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      alert('Error playing audio');
    }
  };

  // Clean up audio on unmount or when modal closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-sm bg-[#111111] p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6"
                    style={{ color: '#b59f3b' }}
                  >
                    Breakdown
                  </Dialog.Title>
                  
                  <div className="flex items-center space-x-3">
                    {/* Rank container */}
                    {responseId && onRankUpdate && (
                      <div
                        className="rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400"
                        style={{
                          border: `3px solid ${getRankBorderColor(rank)}`,
                          backgroundColor: '#111111'
                        }}
                      >
                        <button
                          onClick={() => onRankClick(false)}
                          disabled={rank <= 1}
                          className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                        >
                          <ChevronDownIcon className="h-5 w-5" />
                        </button>
                        <span className="px-1.5 rounded text-xs text-white">
                          {rank}
                        </span>
                        <button
                          onClick={() => onRankClick(true)}
                          disabled={rank >= 3}
                          className="text-white hover:text-gray-300 disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1"
                        >
                          <ChevronUpIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    {/* Pause/Play button */}
                    {responseId && onPauseToggle && (
                      <button
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
                    )}

                    {/* Text to Speech button */}
                    <button
                      onClick={handleTextToSpeech}
                      className={`transition-colors duration-200 ${
                        isPlaying 
                          ? 'text-green-400 hover:text-green-600' 
                          : 'text-blue-400 hover:text-blue-700'
                      }`}
                      disabled={!audio?.success}
                    >
                      <SpeakerWaveIcon className="h-6 w-6" />
                    </button>

                    {/* Close button */}
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
                <div className="mt-4">
                  <div className="text-white whitespace-pre-line leading-relaxed overflow-y-auto max-h-96" style={{ color: '#b59f3b' }}>
                    {breakdown}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-sm border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    Close
                  </button>
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