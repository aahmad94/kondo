'use client';

import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Tooltip from '../Tooltip';
import { useIsMobile } from '../../hooks/useIsMobile';

interface BreakdownButtonProps {
  onBreakdownClick?: () => void | Promise<void>;
  tooltipContent?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
}

const BreakdownButton: React.FC<BreakdownButtonProps> = ({ 
  onBreakdownClick,
  tooltipContent = "Dissect",
  buttonRef,
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isMobile } = useIsMobile();
  const internalRef = React.useRef<HTMLButtonElement>(null);
  const ref = buttonRef || internalRef;

  const handleClick = async () => {
    if (onBreakdownClick) {
      await onBreakdownClick();
    }
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
            className={`text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group ${className}`}
          >
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>
        </Tooltip>
      ) : (
        <button 
          ref={ref}
          onClick={handleClick}
          className={`text-blue-400 hover:text-blue-700 transition-colors duration-200 relative group ${className}`}
        >
          <MagnifyingGlassIcon className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default BreakdownButton; 