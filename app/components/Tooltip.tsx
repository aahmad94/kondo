'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  isVisible: boolean;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export default function Tooltip({ children, content, isVisible, buttonRef }: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 0;
      
      setPosition({
        top: buttonRect.top - tooltipHeight - 8, // 8px gap
        left: buttonRect.left + (buttonRect.width / 2)
      });
    }
  }, [isVisible, buttonRef]);

  if (!isVisible) return <>{children}</>;

  return (
    <>
      {children}
      {createPortal(
        <div
          ref={tooltipRef}
          className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-100 transition-opacity whitespace-nowrap z-[100]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
} 