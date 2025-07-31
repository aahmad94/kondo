'use client';

import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  useEffect(() => {
    // Apply theme class to document element
    document.documentElement.className = theme === 'light' ? 'light' : 'dark';
  }, [theme]);
  
  return <>{children}</>;
} 