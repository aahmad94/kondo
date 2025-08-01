'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import Tooltip from '../Tooltip';
import { useIsMobile } from '../../hooks/useIsMobile';

interface RankContainerProps {
  rank: number;
  onRankClick?: (increment: boolean) => void | Promise<void>;
  className?: string;
  forceDarkMode?: boolean;
}

const RankContainer: React.FC<RankContainerProps> = ({ 
  rank, 
  onRankClick,
  className = '',
  forceDarkMode = false
}) => {
  const [rankContainerOutline, setRankContainerOutline] = useState('#d93900');
  const [isUpChevronHovered, setIsUpChevronHovered] = useState(false);
  const [isDownChevronHovered, setIsDownChevronHovered] = useState(false);
  const upChevronRef = React.useRef<HTMLButtonElement>(null);
  const downChevronRef = React.useRef<HTMLButtonElement>(null);
  const { isMobile } = useIsMobile();

  const red = '#d93900';
  const yellow = '#b59f3b';
  const green = '#2ea149';

  useEffect(() => {
    if (rank === 1) {
      setRankContainerOutline(red);
    } else if (rank === 2) {
      setRankContainerOutline(yellow);
    } else if (rank === 3) {
      setRankContainerOutline(green);
    }
  }, [rank]);

  const handleRankClick = async (increment: boolean) => {
    if (!onRankClick) return;
    
    const newRank = increment ? rank + 1 : rank - 1;
    if (newRank >= 1 && newRank <= 3) {
      await onRankClick(increment);
    }
  };

  return (
    <div
      className={`rank-container flex items-center gap-1 px-2 rounded-sm transition-colors duration-400 ${forceDarkMode ? 'bg-gray-900' : 'bg-card'} ${className}`}
      style={{
        border: `3px solid ${rankContainerOutline}`
      }}
    >
      {!isMobile ? (
        <Tooltip
          content="Rank higher"
          isVisible={isUpChevronHovered}
          buttonRef={upChevronRef}
        >
          <button
            ref={upChevronRef}
            onClick={() => handleRankClick(true)}
            disabled={rank >= 3 || !onRankClick}
            className={`${forceDarkMode ? 'text-white hover:text-gray-300' : 'text-card-foreground hover:text-muted-foreground'} disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1`}
            onMouseEnter={() => setIsUpChevronHovered(true)}
            onMouseLeave={() => setIsUpChevronHovered(false)}
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
        </Tooltip>
      ) : (
        <button
          ref={upChevronRef}
          onClick={() => handleRankClick(true)}
          disabled={rank >= 3 || !onRankClick}
          className={`${forceDarkMode ? 'text-white hover:text-gray-300' : 'text-card-foreground hover:text-muted-foreground'} disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1`}
        >
          <ChevronUpIcon className="h-5 w-5" />
        </button>
      )}
      
      <span className={`px-1.5 rounded text-xs ${forceDarkMode ? 'text-white' : 'text-card-foreground'}`}>
        {rank}
      </span>
      
      {!isMobile ? (
        <Tooltip
          content="Rank lower"
          isVisible={isDownChevronHovered}
          buttonRef={downChevronRef}
        >
          <button
            ref={downChevronRef}
            onClick={() => handleRankClick(false)}
            disabled={rank <= 1 || !onRankClick}
            className={`${forceDarkMode ? 'text-white hover:text-gray-300' : 'text-card-foreground hover:text-muted-foreground'} disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1`}
            onMouseEnter={() => setIsDownChevronHovered(true)}
            onMouseLeave={() => setIsDownChevronHovered(false)}
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </Tooltip>
      ) : (
        <button
          ref={downChevronRef}
          onClick={() => handleRankClick(false)}
          disabled={rank <= 1 || !onRankClick}
          className={`${forceDarkMode ? 'text-white hover:text-gray-300' : 'text-card-foreground hover:text-muted-foreground'} disabled:opacity-50 transition-all duration-200 font-bold hover:scale-110 active:scale-95 px-1`}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default RankContainer; 