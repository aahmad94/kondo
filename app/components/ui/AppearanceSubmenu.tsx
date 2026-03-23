'use client';

import React, { useState } from 'react';
import { ChevronRightIcon, CheckIcon } from '@heroicons/react/24/solid';
import type { Theme } from '../../contexts/ThemeContext';

interface AppearanceOption {
  value: Theme;
  label: string;
  icon: string;
}

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark',  label: 'Dark',  icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

interface AppearanceSubmenuProps {
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
}

export function AppearanceSubmenu({ currentTheme, onSelect }: AppearanceSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const current = APPEARANCE_OPTIONS.find((o) => o.value === currentTheme);

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
        aria-expanded={isOpen}
      >
        <span>Appearance</span>
        <span className="flex items-center gap-1 text-muted-foreground text-xs ml-4">
          {current?.icon} {current?.label}
          <ChevronRightIcon
            className={`h-3 w-3 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border/40">
          {APPEARANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full pl-6 pr-4 py-2 text-sm text-left text-popover-foreground hover:bg-accent whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </span>
              {currentTheme === option.value && (
                <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
