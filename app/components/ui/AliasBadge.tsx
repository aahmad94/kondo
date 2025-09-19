'use client';

import React from 'react';
import { getAliasCSSVars } from '@/lib/utils';

interface AliasBadgeProps {
  alias: string;
  onClick?: () => void;
  className?: string;
  customColor?: string;
  truncateAfter?: number;
  height?: string;
}

export default function AliasBadge({ 
  alias, 
  onClick, 
  className = '',
  customColor,
  truncateAfter,
  height
}: AliasBadgeProps) {
  const badgeStyle = {
    ...(customColor 
      ? {
          backgroundColor: customColor,
          borderColor: customColor,
          color: '#333333',
          border: '1px solid',
          opacity: 0.9
        }
      : getAliasCSSVars(alias)),
    ...(height && { height })
  };

  const displayAlias = truncateAfter && alias.length > truncateAfter 
    ? `${alias.substring(0, truncateAfter)}...`
    : alias;

  return (
    <span 
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${className}`}
      style={badgeStyle}
    >
      @{displayAlias}
    </span>
  );
}
