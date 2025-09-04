'use client';

import React, { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import Tooltip from '../../Tooltip';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ImportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isImporting?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ImportButton({ 
  onClick, 
  disabled = false,
  isImporting = false,
  buttonRef 
}: ImportButtonProps) {
  const { isMobile } = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) {
    return (
      <button 
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled || isImporting}
        className="text-blue-500 hover:text-blue-400 disabled:opacity-50 transition-colors duration-200"
      >
        <ArrowDownTrayIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Tooltip
      content="Import this response to your bookmarks"
      isVisible={isHovered}
      buttonRef={buttonRef || React.createRef()}
    >
      <button 
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || isImporting}
        className="text-blue-500 hover:text-blue-400 disabled:opacity-50 transition-colors duration-200"
      >
        <ArrowDownTrayIcon className="h-6 w-6" />
      </button>
    </Tooltip>
  );
}
