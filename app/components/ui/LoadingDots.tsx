'use client';

import React from 'react';

const DOTS_ANIMATION_CSS = `
  .dots-animation::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }
  
  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60% { content: '...'; }
    80%, 100% { content: ''; }
  }
`;

interface LoadingDotsProps {
  /** Text shown before the animated ellipsis. Default: "Loading" */
  label?: string;
  /** Optional class name for the wrapper div */
  className?: string;
}

export default function LoadingDots({ label = 'Loading', className = '' }: LoadingDotsProps) {
  return (
    <div className={className}>
      <span>{label}</span>
      <span className="dots-animation">
        <style jsx>{DOTS_ANIMATION_CSS}</style>
      </span>
    </div>
  );
}
