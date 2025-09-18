import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface SearchBarProps {
  onSearch: (query: string) => void;
  selectedLanguage: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ onSearch, selectedLanguage, value, onChange }: SearchBarProps) {
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onSearch(val);
    }, 200);
  };

  return (
    <div className="flex items-center bg-background rounded-sm">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="search responses..."
        className="w-full flex-grow mx-4 mt-3 px-4 py-2 bg-card text-card-foreground border border-border rounded-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder-muted-foreground disabled:opacity-50 min-h-[${textareaMinHeight}px] h-[${textareaMinHeight}px] max-h-[${textareaMaxHeight}px] overflow-y-auto leading-[1.5]"
      />
    </div>
  );
} 