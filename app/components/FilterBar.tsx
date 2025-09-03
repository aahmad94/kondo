'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  FireIcon,
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useIsMobile } from '../hooks/useIsMobile';
import type { CommunityFilters } from '@/lib/community';

interface FilterBarProps {
  onFiltersChange: (filters: CommunityFilters) => void;
  isLoading?: boolean;
  initialFilters?: CommunityFilters;
}

export default function FilterBar({ onFiltersChange, isLoading = false, initialFilters = {} }: FilterBarProps) {
  const { isMobile } = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter states
  const [bookmarkTitle, setBookmarkTitle] = useState(initialFilters.bookmarkTitle || '');
  const [creatorAlias, setCreatorAlias] = useState(initialFilters.creatorAlias || '');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'imports'>(initialFilters.sortBy || 'recent');
  
  // UI states
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const bookmarkInputRef = useRef<HTMLInputElement>(null);
  const creatorInputRef = useRef<HTMLInputElement>(null);

  // Debounced filter update
  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    const filters: CommunityFilters = {
      bookmarkTitle: bookmarkTitle || undefined,
      creatorAlias: creatorAlias || undefined,
      sortBy,
      sortOrder: 'desc', // Always descending (most recent/popular/imported first)
      ...newFilters
    };

    onFiltersChange(filters);

    // Update URL with filters (without triggering navigation)
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Update URL params
    if (filters.bookmarkTitle) {
      params.set('bookmarkTitle', filters.bookmarkTitle);
    } else {
      params.delete('bookmarkTitle');
    }
    
    if (filters.creatorAlias) {
      params.set('creatorAlias', filters.creatorAlias);
    } else {
      params.delete('creatorAlias');
    }
    
    if (filters.sortBy && filters.sortBy !== 'recent') {
      params.set('sortBy', filters.sortBy);
    } else {
      params.delete('sortBy');
    }

    // Update URL without navigation
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.replaceState({}, '', newUrl);
  }, [bookmarkTitle, creatorAlias, sortBy, onFiltersChange, searchParams]);

  // Debounced search handlers
  const handleBookmarkSearch = (value: string) => {
    setBookmarkTitle(value);
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      updateFilters({ bookmarkTitle: value || undefined });
    }, 300);
    
    setSearchDebounceTimer(timer);
  };

  const handleCreatorSearch = (value: string) => {
    setCreatorAlias(value);
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      updateFilters({ creatorAlias: value || undefined });
    }, 300);
    
    setSearchDebounceTimer(timer);
  };

  // Immediate update handlers
  const handleSortChange = (newSortBy: 'recent' | 'popular' | 'imports') => {
    setSortBy(newSortBy);
    updateFilters({ sortBy: newSortBy, sortOrder: 'desc' });
  };

  // Clear all filters (reset to recent)
  const clearAllFilters = () => {
    setBookmarkTitle('');
    setCreatorAlias('');
    setSortBy('recent');
    
    if (bookmarkInputRef.current) bookmarkInputRef.current.value = '';
    if (creatorInputRef.current) creatorInputRef.current.value = '';
    
    updateFilters({
      bookmarkTitle: undefined,
      creatorAlias: undefined,
      sortBy: 'recent',
      sortOrder: 'desc'
    });
  };

  // Initialize from URL params
  useEffect(() => {
    if (!searchParams) return;
    
    const urlBookmarkTitle = searchParams.get('bookmarkTitle');
    const urlCreatorAlias = searchParams.get('creatorAlias');
    const urlSortBy = searchParams.get('sortBy') as 'recent' | 'popular' | 'imports';

    // Only set bookmark title filter if it's not a navigation bookmark (community, daily summary, etc.)
    if (urlBookmarkTitle && !['community', 'daily summary', 'dojo', 'search', 'all responses'].includes(urlBookmarkTitle)) {
      setBookmarkTitle(urlBookmarkTitle);
      if (bookmarkInputRef.current) bookmarkInputRef.current.value = urlBookmarkTitle;
    }
    
    if (urlCreatorAlias) {
      setCreatorAlias(urlCreatorAlias);
      if (creatorInputRef.current) creatorInputRef.current.value = urlCreatorAlias;
    }
    
    if (urlSortBy && ['recent', 'popular', 'imports'].includes(urlSortBy)) {
      setSortBy(urlSortBy);
    }
  }, [searchParams]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  // Check if any filters are active (only search filters, not sort)
  const hasActiveFilters = bookmarkTitle || creatorAlias;

  return (
    <div className="bg-background border border-border rounded-lg p-4 mx-2 my-2">
      <div className="flex flex-col gap-4">
        {/* Main search row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bookmark title search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={bookmarkInputRef}
                type="text"
                placeholder="bookmark title..."
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                onChange={(e) => handleBookmarkSearch(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Creator search */}
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <input
                ref={creatorInputRef}
                type="text"
                placeholder="creator alias..."
                className="w-full pl-8 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                onChange={(e) => handleCreatorSearch(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => handleSortChange('recent')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'recent' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={isLoading}
            >
              <ClockIcon className="h-4 w-4" />
              {!isMobile && 'Recent'}
            </button>
            <button
              onClick={() => handleSortChange('popular')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'popular' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={isLoading}
            >
              <FireIcon className="h-4 w-4" />
              {!isMobile && 'Popular'}
            </button>
            <button
              onClick={() => handleSortChange('imports')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'imports' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={isLoading}
            >
              <HeartIcon className="h-4 w-4" />
              {!isMobile && 'Imports'}
            </button>
          </div>

          {/* Clear search filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
