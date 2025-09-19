'use client';

import React, { useState } from 'react';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import Tooltip from '../../Tooltip';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface QuoteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export default function QuoteButton({ 
  onClick, 
  disabled = false,
  buttonRef 
}: QuoteButtonProps) {
  const { isMobile } = useIsMobile();
  const [isHovered, setIsHovered] = useState(false);

  if (isMobile) {
    return (
      <button 
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        className="text-foreground hover:text-muted-foreground disabled:opacity-50 transition-colors duration-200"
      >
        <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Tooltip
      content="Ask a question about this response"
      isVisible={isHovered}
      buttonRef={buttonRef}
    >
      <button 
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled}
        className="text-foreground hover:text-muted-foreground disabled:opacity-50 transition-colors duration-200"
      >
        <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
      </button>
    </Tooltip>
  );
}
