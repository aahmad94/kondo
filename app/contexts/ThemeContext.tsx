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
  const [theme, setTheme] = useState<Theme>('light'); // Default to light mode
  const [isLoading, setIsLoading] = useState(true);
  const { data: session, status } = useSession();

  // Load theme from database when user is authenticated
  useEffect(() => {
    const loadTheme = async () => {
      if (status === 'loading') return;
      
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/getUserTheme');
          if (response.ok) {
            const data = await response.json();
            setTheme(data.theme as Theme);
          } else {
            console.error('Failed to load theme, response not ok:', response.status);
          }
        } catch (error) {
          console.error('Error loading user theme:', error);
          // Keep default theme on error
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [session, status]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

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
      } catch (error) {
        console.error('Error saving user theme:', error);
        // Theme is still changed locally even if save fails
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