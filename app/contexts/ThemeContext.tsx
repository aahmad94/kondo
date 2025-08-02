'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Immediately check localStorage for theme to prevent flash
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      return savedTheme || 'light';
    }
    return 'light';
  });
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();

  // Load theme from database when user is authenticated, localStorage as fallback
  useEffect(() => {
    const loadTheme = async () => {
      if (status === 'loading') return;
      
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/getUserTheme');
          if (response.ok) {
            const data = await response.json();
            const dbTheme = data.theme as Theme;
            
            // Update state and localStorage with database theme (authoritative source)
            setTheme(currentTheme => {
              if (dbTheme !== currentTheme) {
                localStorage.setItem('theme', dbTheme);
                console.log('Updated theme from database:', dbTheme);
                return dbTheme;
              }
              return currentTheme;
            });
          } else {
            console.error('Failed to load theme, response not ok:', response.status);
          }
        } catch (error) {
          console.error('Error loading user theme:', error);
          // Keep current theme (from localStorage or default) on error
        }
      } else {
        // Not authenticated, but still apply localStorage theme if available
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
          setTheme(currentTheme => savedTheme !== currentTheme ? savedTheme : currentTheme);
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [session, status]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Always save to localStorage for immediate access on next visit
    localStorage.setItem('theme', newTheme);

    // Persist to database if user is authenticated
    if (session?.user?.email) {
      try {
        const response = await fetch('/api/updateUserTheme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Theme saved to database:', newTheme);
      } catch (error) {
        console.error('Error saving user theme:', error);
        // Theme is still changed locally and in localStorage even if database save fails
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoading }}>
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