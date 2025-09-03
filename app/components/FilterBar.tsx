'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  ChevronDownIcon,
  FireIcon,
  ClockIcon,
  HeartIcon,
  AdjustmentsHorizontalIcon
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
  const [minImports, setMinImports] = useState(initialFilters.minImports || 0);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'imports'>(initialFilters.sortBy || 'recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialFilters.sortOrder || 'desc');
  
  // UI states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const bookmarkInputRef = useRef<HTMLInputElement>(null);
  const creatorInputRef = useRef<HTMLInputElement>(null);
  const minImportsInputRef = useRef<HTMLInputElement>(null);

  // Debounced filter update
  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    const filters: CommunityFilters = {
      bookmarkTitle: bookmarkTitle || undefined,
      creatorAlias: creatorAlias || undefined,
      minImports: minImports > 0 ? minImports : undefined,
      sortBy,
      sortOrder,
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
    
    if (filters.minImports && filters.minImports > 0) {
      params.set('minImports', filters.minImports.toString());
    } else {
      params.delete('minImports');
    }
    
    if (filters.sortBy && filters.sortBy !== 'recent') {
      params.set('sortBy', filters.sortBy);
    } else {
      params.delete('sortBy');
    }
    
    if (filters.sortOrder && filters.sortOrder !== 'desc') {
      params.set('sortOrder', filters.sortOrder);
    } else {
      params.delete('sortOrder');
    }

    // Update URL without navigation
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.replaceState({}, '', newUrl);
  }, [bookmarkTitle, creatorAlias, minImports, sortBy, sortOrder, onFiltersChange, searchParams]);

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
    updateFilters({ sortBy: newSortBy });
  };

  const handleMinImportsChange = (value: number) => {
    setMinImports(value);
    updateFilters({ minImports: value > 0 ? value : undefined });
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    updateFilters({ sortOrder: newOrder });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setBookmarkTitle('');
    setCreatorAlias('');
    setMinImports(0);
    setSortBy('recent');
    setSortOrder('desc');
    
    if (bookmarkInputRef.current) bookmarkInputRef.current.value = '';
    if (creatorInputRef.current) creatorInputRef.current.value = '';
    if (minImportsInputRef.current) minImportsInputRef.current.value = '0';
    
    updateFilters({
      bookmarkTitle: undefined,
      creatorAlias: undefined,
      minImports: undefined,
      sortBy: 'recent',
      sortOrder: 'desc'
    });
  };

  // Initialize from URL params
  useEffect(() => {
    if (!searchParams) return;
    
    const urlBookmarkTitle = searchParams.get('bookmarkTitle');
    const urlCreatorAlias = searchParams.get('creatorAlias');
    const urlMinImports = searchParams.get('minImports');
    const urlSortBy = searchParams.get('sortBy') as 'recent' | 'popular' | 'imports';
    const urlSortOrder = searchParams.get('sortOrder') as 'asc' | 'desc';

    if (urlBookmarkTitle) {
      setBookmarkTitle(urlBookmarkTitle);
      if (bookmarkInputRef.current) bookmarkInputRef.current.value = urlBookmarkTitle;
    }
    
    if (urlCreatorAlias) {
      setCreatorAlias(urlCreatorAlias);
      if (creatorInputRef.current) creatorInputRef.current.value = urlCreatorAlias;
    }
    
    if (urlMinImports) {
      const minImportsValue = parseInt(urlMinImports);
      setMinImports(minImportsValue);
      if (minImportsInputRef.current) minImportsInputRef.current.value = minImportsValue.toString();
    }
    
    if (urlSortBy && ['recent', 'popular', 'imports'].includes(urlSortBy)) {
      setSortBy(urlSortBy);
    }
    
    if (urlSortOrder && ['asc', 'desc'].includes(urlSortOrder)) {
      setSortOrder(urlSortOrder);
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

  // Check if any filters are active
  const hasActiveFilters = bookmarkTitle || creatorAlias || minImports > 0 || sortBy !== 'recent' || sortOrder !== 'desc';

  return (
    <div className="bg-background border border-border rounded-lg p-4 mb-4">
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
                placeholder="Search bookmark titles..."
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
                placeholder="Creator alias..."
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

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-1 px-3 py-2 border border-input rounded-md bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            disabled={isLoading}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            {!isMobile && 'Filters'}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear filters */}
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

        {/* Advanced filters */}
        {showAdvancedFilters && (
          <div className="flex items-center gap-4 pt-3 border-t border-border flex-wrap">
            {/* Minimum imports filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="minImports" className="text-sm text-muted-foreground whitespace-nowrap">
                Min imports:
              </label>
              <input
                ref={minImportsInputRef}
                id="minImports"
                type="number"
                min="0"
                max="1000"
                defaultValue="0"
                className="w-20 px-2 py-1 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                onChange={(e) => handleMinImportsChange(parseInt(e.target.value) || 0)}
                disabled={isLoading}
              />
            </div>

            {/* Sort order toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <button
                onClick={handleSortOrderToggle}
                className="flex items-center gap-1 px-2 py-1 border border-input rounded bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                disabled={isLoading}
              >
                {sortOrder === 'desc' ? '↓ Newest first' : '↑ Oldest first'}
              </button>
            </div>
          </div>
        )}

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FunnelIcon className="h-3 w-3" />
            <span>
              Filtering by: {[
                bookmarkTitle && `bookmark "${bookmarkTitle}"`,
                creatorAlias && `creator "@${creatorAlias}"`,
                minImports > 0 && `min ${minImports} imports`,
                sortBy !== 'recent' && `sorted by ${sortBy}`,
                sortOrder !== 'desc' && 'ascending order'
              ].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
