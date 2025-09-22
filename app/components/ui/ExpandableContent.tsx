'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

/**
 * ExpandableContent component that truncates content with a fade overlay
 * and provides a "Read more" / "Show less" toggle button.
 * 
 * Useful for markdown content that can become very long (e.g., tables from verb AI command).
 * Theme-aware with proper dark/light mode support using CSS custom properties.
 * 
 * @example
 * <ExpandableContent maxHeight={300}>
 *   <StyledMarkdown>{content}</StyledMarkdown>
 * </ExpandableContent>
 */
interface ExpandableContentProps {
  children: React.ReactNode;
  maxHeight?: number; // in pixels
  className?: string;
  expandedClassName?: string;
}

export default function ExpandableContent({
  children,
  maxHeight = 200,
  className = '',
  expandedClassName = ''
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setNeedsTruncation(contentHeight > maxHeight);
    }
  }, [maxHeight, children]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? expandedClassName : ''
        }`}
        style={{
          maxHeight: isExpanded ? 'none' : `${maxHeight}px`
        }}
      >
        {children}
      </div>
      
      {needsTruncation && (
        <div className="flex justify-center mt-2">
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 bg-background/80 hover:bg-muted/50 rounded-md border border-border/50 hover:border-border"
          >
            <span>{isExpanded ? 'Show less' : 'Read more'}</span>
            <ChevronDownIcon 
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
