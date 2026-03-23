'use client';

import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    document.documentElement.className = effectiveTheme === 'light' ? 'light' : 'dark';
  }, [effectiveTheme]);

  return <>{children}</>;
}
