'use client';

import React, { useState } from 'react';
import { TableCellsIcon } from '@heroicons/react/24/solid';
import Tooltip from '../../Tooltip';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface BreakdownButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export default function BreakdownButton({ 
  onClick, 
  disabled = false, 
  isLoading = false,
  buttonRef 
}: BreakdownButtonProps) {
  const { isMobile } = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) {
    return (
      <button 
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || isLoading}
        className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors duration-200"
      >
        <TableCellsIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Tooltip
      content="Breakdown phrase"
      isVisible={isHovered}
      buttonRef={buttonRef || React.createRef()}
    >
      <button 
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || isLoading}
        className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors duration-200"
      >
        <TableCellsIcon className="h-6 w-6" />
      </button>
    </Tooltip>
  );
}
