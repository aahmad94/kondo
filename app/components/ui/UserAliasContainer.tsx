'use client';

import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface UserAliasContainerProps {
  alias: string;
  onClick?: () => void;
  className?: string;
}

export default function UserAliasContainer({ 
  alias, 
  onClick,
  className = ''
}: UserAliasContainerProps) {
  const { isMobile } = useIsMobile();

  return (
    <div 
      className={`flex items-center justify-center ${
        isMobile ? 'w-10 h-10' : 'w-12 h-12'
      } border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950/20 ${
        onClick ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''
      } transition-colors duration-200 ${className}`}
      onClick={onClick}
    >
      <span className={`${
        isMobile ? 'text-xs' : 'text-sm'
      } font-semibold text-blue-600 dark:text-blue-400 max-w-full truncate px-1`}>
        @{alias}
      </span>
    </div>
  );
}
