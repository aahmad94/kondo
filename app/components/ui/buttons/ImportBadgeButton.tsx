'use client';

import React, { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import Tooltip from '../../Tooltip';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ImportBadgeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isImporting?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ImportBadgeButton({ 
  onClick, 
  disabled = false,
  isImporting = false,
  buttonRef 
}: ImportBadgeButtonProps) {
  const { isMobile } = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) {
    return (
      <button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || isImporting}
        className="text-xs px-2 py-1 rounded-sm bg-muted text-purple-400 hover:bg-accent hover:text-purple-300 disabled:opacity-50 disabled:hover:bg-muted disabled:hover:text-muted-foreground transition-colors duration-200 flex items-center gap-1"
      >
        <ArrowDownTrayIcon className="h-3 w-3" />
        {isImporting ? 'Importing...' : 'Import'}
      </button>
    );
  }

  return (
    <Tooltip
      content="Import to your own bookmark"
      isVisible={isHovered}
      buttonRef={buttonRef || React.createRef()}
    >
      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || isImporting}
        className="text-xs px-2 py-1 rounded-sm bg-muted text-purple-400 hover:bg-accent hover:text-purple-300 disabled:opacity-50 disabled:hover:bg-muted disabled:hover:text-muted-foreground transition-colors duration-200 flex items-center gap-1"
      >
        <ArrowDownTrayIcon className="h-3 w-3" />
        {isImporting ? 'Importing...' : 'Import'}
      </button>
    </Tooltip>
  );
}
