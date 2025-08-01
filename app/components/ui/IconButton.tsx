'use client';

import React, { useState } from 'react';
import Tooltip from '../Tooltip';
import { useIsMobile } from '../../hooks/useIsMobile';

interface IconButtonProps {
  icon: React.ReactNode;
  alternateIcon?: React.ReactNode; // For state-dependent icons like pause/play
  isAlternateState?: boolean; // Whether to show alternate icon
  onClick: () => void | Promise<void>;
  tooltipContent: string | { default: string; alternate: string }; // Can be state-dependent
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  colorScheme?: 'blue' | 'green-yellow' | 'custom';
  customColors?: {
    default: string;
    hover: string;
    alternate?: string;
    alternateHover?: string;
  };
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon,
  alternateIcon,
  isAlternateState = false,
  onClick,
  tooltipContent,
  buttonRef,
  className = '',
  colorScheme = 'blue',
  customColors
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { isMobile } = useIsMobile();
  const internalRef = React.useRef<HTMLButtonElement>(null);
  const ref = buttonRef || internalRef;

  const handleClick = async () => {
    await onClick();
  };

  // Determine colors based on scheme
  const getColors = () => {
    if (customColors) return customColors;
    
    switch (colorScheme) {
      case 'blue':
        return {
          default: 'text-blue-400',
          hover: 'hover:text-blue-300'
        };
      case 'green-yellow':
        return {
          default: isAlternateState ? 'text-green-500' : 'text-yellow-500',
          hover: isAlternateState ? 'hover:text-green-400' : 'hover:text-yellow-400'
        };
      default:
        return {
          default: 'text-blue-400',
          hover: 'hover:text-blue-300'
        };
    }
  };

  const colors = getColors();
  const baseClassName = `transition-colors duration-200 ${colors.default} ${colors.hover} relative group ${className}`;

  // Determine which icon to show
  const currentIcon = (alternateIcon && isAlternateState) ? alternateIcon : icon;

  // Determine tooltip content
  const currentTooltip = typeof tooltipContent === 'string' 
    ? tooltipContent 
    : isAlternateState 
      ? tooltipContent.alternate 
      : tooltipContent.default;

  return (
    <>
      {!isMobile ? (
        <Tooltip
          content={currentTooltip}
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
            {currentIcon}
          </button>
        </Tooltip>
      ) : (
        <button 
          ref={ref}
          onClick={handleClick}
          className={baseClassName}
        >
          {currentIcon}
        </button>
      )}
    </>
  );
};

export default IconButton; 