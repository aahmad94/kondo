'use client';

import React, { useState } from 'react';
import { PlayCircleIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import Tooltip from '../Tooltip';
import { useIsMobile } from '../../hooks/useIsMobile';

interface PauseButtonProps {
  isPaused: boolean;
  responseId: string;
  onPauseToggle: (responseId: string, isPaused: boolean) => Promise<void> | void;
  tooltipContent?: {
    paused: string;
    playing: string;
  };
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
}

const PauseButton: React.FC<PauseButtonProps> = ({ 
  isPaused,
  responseId,
  onPauseToggle,
  tooltipContent = {
    paused: "Resume cycling this response in dojo",
    playing: "Pause cycling this response in dojo"
  },
  buttonRef,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isMobile } = useIsMobile();
  const internalRef = React.useRef<HTMLButtonElement>(null);
  const ref = buttonRef || internalRef;

  const handleClick = async () => {
    await onPauseToggle(responseId, !isPaused);
  };

  const baseClassName = `transition-colors duration-200 ${
    isPaused 
      ? 'text-green-500 hover:text-green-700' 
      : 'text-yellow-500 hover:text-yellow-700'
  } ${className}`;

  return (
    <>
      {!isMobile ? (
        <Tooltip
          content={isPaused ? tooltipContent.paused : tooltipContent.playing}
          isVisible={isHovered}
          buttonRef={ref}
        >
          <button 
            ref={ref}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={baseClassName}
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
          ref={ref}
          onClick={handleClick}
          className={baseClassName}
        >
          {isPaused ? (
            <PlayCircleIcon className="h-5 w-5" />
          ) : (
            <PauseCircleIcon className="h-5 w-5" />
          )}
        </button>
      )}
    </>
  );
};

export default PauseButton; 