'use client';

import React, { useState, useRef } from 'react';
import { HeartIcon } from '@heroicons/react/24/solid';
import Tooltip from '../../Tooltip';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ImportHeartButtonProps {
  importCount: number;
  className?: string;
}

export function ImportHeartButton({ importCount, className = '' }: ImportHeartButtonProps) {
  const isMobile = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Determine heart color based on import count
  const heartColor = importCount > 0 ? 'text-red-500' : 'text-muted-foreground';
  
  // Generate tooltip text based on import count
  const getTooltipText = () => {
    if (importCount === 0) {
      return "Be the first to import this";
    } else if (importCount === 1) {
      return "This has been imported 1 time";
    } else {
      return `This has been imported ${importCount} times`;
    }
  };

  // On mobile, don't show tooltip
  if (isMobile) {
    return (
      <button 
        className={`flex items-center gap-1 cursor-default bg-transparent border-none p-0 ${className}`}
      >
        <HeartIcon className={`h-3 w-3 ${heartColor}`} />
        <span>{importCount}</span>
      </button>
    );
  }

  // On desktop, wrap with tooltip
  return (
    <Tooltip
      content={getTooltipText()}
      isVisible={isHovered}
      buttonRef={buttonRef}
    >
      <button 
        ref={buttonRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center gap-1 cursor-default bg-transparent border-none p-0 hover:opacity-80 transition-opacity ${className}`}
      >
        <HeartIcon className={`h-3 w-3 ${heartColor}`} />
        <span>{importCount}</span>
      </button>
    </Tooltip>
  );
}
