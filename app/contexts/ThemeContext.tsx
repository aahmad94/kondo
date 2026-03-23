'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserThemeAction } from '../../actions/theme';

export type Theme = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (mode: Theme) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemPreference(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Read localStorage so authenticated users get fast rendering on initial
    // paint (before the DB preference loads). For unauthenticated users,
    // loadTheme will correct this to 'system' once auth status is known.
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    }
    return 'system';
  });

  // Tracks the live OS colour scheme independently of the stored preference
  const [systemPreference, setSystemPreference] = useState<EffectiveTheme>(getSystemPreference);

  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();

  // Always listen to OS colour-scheme changes so systemPreference stays current
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemPreference(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // effectiveTheme is computed during render — no second state, no timing gap
  const effectiveTheme = useMemo<EffectiveTheme>(
    () => (theme === 'system' ? systemPreference : theme),
    [theme, systemPreference]
  );

  // Load preference from database when authenticated
  useEffect(() => {
    const loadTheme = async () => {
      if (status === 'loading') return;

      if (session?.user?.email) {
        try {
          const response = await fetch('/api/getUserTheme');
          if (response.ok) {
            const data = await response.json();
            const dbTheme = data.theme as Theme;
            const valid: Theme[] = ['light', 'dark', 'system'];
            const resolved = valid.includes(dbTheme) ? dbTheme : 'system';

            setTheme((current) => {
              if (resolved !== current) {
                localStorage.setItem('theme', resolved);
                return resolved;
              }
              return current;
            });
          }
        } catch (error) {
          console.error('Error loading user theme:', error);
        }
      } else {
        // Not authenticated: always default to system preference.
        // localStorage may contain a stale explicit choice from a previous session,
        // but unauthenticated visitors should follow the OS, not a saved value.
        setTheme('system');
        localStorage.setItem('theme', 'system');
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [session, status]);

  const setThemeMode = useCallback(async (mode: Theme) => {
    setTheme(mode);
    localStorage.setItem('theme', mode);

    if (session?.user?.email) {
      try {
        const result = await updateUserThemeAction(mode);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update theme');
        }
      } catch (error) {
        console.error('Error saving user theme:', error);
      }
    }
  }, [session]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setThemeMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
