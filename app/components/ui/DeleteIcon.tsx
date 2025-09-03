'use client';

import React from 'react';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface DeleteIconProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function DeleteIcon({ 
  onClick, 
  disabled = false, 
  className = '',
  size = 'md' 
}: DeleteIconProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6', 
    lg: 'h-7 w-7'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors duration-200 ${className}`}
    >
      <XCircleIcon className={sizeClasses[size]} />
    </button>
  );
}
