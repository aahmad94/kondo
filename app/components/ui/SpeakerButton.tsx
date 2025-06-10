'use client';

import React, { useState } from 'react';
import { SpeakerWaveIcon } from '@heroicons/react/24/solid';
import Tooltip from '../Tooltip';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAudio } from '../../contexts/AudioContext';

interface SpeakerButtonProps {
  responseId: string;
  textToSpeak: string;
  selectedLanguage: string;
  cachedAudio?: { audio: string; mimeType: string } | null;
  tooltipContent?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: string) => void;
}

const SpeakerButton: React.FC<SpeakerButtonProps> = ({ 
  responseId,
  textToSpeak,
  selectedLanguage,
  cachedAudio = null,
  tooltipContent = "Listen to pronunciation",
  buttonRef,
  className = '',
  onLoadingChange,
  onError
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isMobile } = useIsMobile();
  const { isPlaying, currentResponseId, playAudio } = useAudio();
  const internalRef = React.useRef<HTMLButtonElement>(null);
  const ref = buttonRef || internalRef;

  // Check if this specific button is currently playing
  const isCurrentlyPlaying = isPlaying && currentResponseId === responseId;

  const handleClick = async () => {
    await playAudio(
      responseId,
      cachedAudio,
      textToSpeak,
      selectedLanguage,
      onLoadingChange,
      onError
    );
  };

  return (
    <>
      {!isMobile ? (
        <Tooltip
          content={tooltipContent}
          isVisible={isHovered}
          buttonRef={ref}
        >
          <button 
            ref={ref}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`transition-colors duration-200 ${
              isCurrentlyPlaying
                ? 'text-green-400 hover:text-green-600'
                : 'text-blue-400 hover:text-blue-700'
            } relative group ${className}`}
          >
            <SpeakerWaveIcon className="h-6 w-6" />
          </button>
        </Tooltip>
      ) : (
        <button 
          ref={ref}
          onClick={handleClick}
          className={`transition-colors duration-200 ${
            isCurrentlyPlaying
              ? 'text-green-400 hover:text-green-600'
              : 'text-blue-400 hover:text-blue-700'
          } relative group ${className}`}
        >
          <SpeakerWaveIcon className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default SpeakerButton; 