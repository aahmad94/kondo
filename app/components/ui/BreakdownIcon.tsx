'use client';

import { useRef, useState } from 'react';
import { Player } from '@lordicon/react';

// Import the glasses icon JSON data
const ICON = require('./assets/glasses-blink-icon.json');

interface BreakdownIconProps {
  size?: number;
  className?: string;
}

export default function BreakdownIcon({ size = 24, className = '' }: BreakdownIconProps) {
  const playerRef = useRef<Player>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Small delay to ensure color change renders before animation starts
    setTimeout(() => {
      playerRef.current?.playFromBeginning();
    }, 10);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    playerRef.current?.goToFirstFrame();
  };

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Player
        ref={playerRef}
        icon={ICON}
        size={size}
        colors={isHovered ? "primary:#1d4ed8,secondary:#1d4ed8" : "primary:#60a5fa,secondary:#60a5fa"}
      />
    </div>
  );
} 