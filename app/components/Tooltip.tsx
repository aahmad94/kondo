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
  const dismissTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 0;
      
      setPosition({
        top: buttonRect.top - tooltipHeight - 8, // 8px gap
        left: buttonRect.left + (buttonRect.width / 2)
      });

      // Set auto-dismiss timer
      dismissTimerRef.current = setTimeout(() => {
        if (buttonRef.current) {
          // Trigger mouseleave event to hide tooltip
          const event = new MouseEvent('mouseleave', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          buttonRef.current.dispatchEvent(event);
        }
      }, 3000); // Dismiss after 3 seconds

      // Cleanup timer on unmount or when tooltip becomes invisible
      return () => {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
      };
    }
  }, [isVisible, buttonRef]);

  // Handle touch events
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // If touch is outside the tooltip and button, hide the tooltip
      if (buttonRef.current && tooltipRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        
        if (
          (touch.clientX < buttonRect.left || 
           touch.clientX > buttonRect.right || 
           touch.clientY < buttonRect.top || 
           touch.clientY > buttonRect.bottom) &&
          (touch.clientX < tooltipRect.left || 
           touch.clientX > tooltipRect.right || 
           touch.clientY < tooltipRect.top || 
           touch.clientY > tooltipRect.bottom)
        ) {
          const event = new MouseEvent('mouseleave', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          buttonRef.current.dispatchEvent(event);
        }
      }
    };

    if (isVisible) {
      document.addEventListener('touchstart', handleTouchStart);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
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