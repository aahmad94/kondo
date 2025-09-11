'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ClockIcon,
  HeartIcon,
  ChevronDownIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useIsMobile } from '../hooks/useIsMobile';
import { CommunityClientService } from '@/lib/community';
import type { CommunityFilters } from '@/lib/community';

interface FilterBarProps {
  onFiltersChange: (filters: CommunityFilters) => void;
  onShuffle?: () => void;
  isLoading?: boolean;
  initialFilters?: CommunityFilters;
}

export default function FilterBar({ 
  onFiltersChange, 
  onShuffle,
  isLoading = false, 
  initialFilters = {}
}: FilterBarProps) {
  const { isMobile } = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter states
  const [selectedBookmark, setSelectedBookmark] = useState<string>(''); // Selected bookmark from dropdown
  const [creatorAlias, setCreatorAlias] = useState(initialFilters.creatorAlias || '');
  const [selectedFilter, setSelectedFilter] = useState<'recent' | 'imports' | 'shuffle'>(initialFilters.sortBy || 'recent');
  
  // UI states
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [availableBookmarks, setAvailableBookmarks] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const creatorInputRef = useRef<HTMLInputElement>(null);

  // Filter update
  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    const filters: CommunityFilters = {
      bookmarkTitle: selectedBookmark || undefined,
      creatorAlias: creatorAlias || undefined,
      sortBy: selectedFilter === 'shuffle' ? 'recent' : selectedFilter, // Use recent as base for shuffle
      sortOrder: 'desc', // Always descending (most recent/popular/imported first)
      ...newFilters
    };

    onFiltersChange(filters);

    // Update URL with filters (without triggering navigation)
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Update URL params for filter persistence
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
    

    // Update URL without navigation
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.replaceState({}, '', newUrl);
  }, [selectedBookmark, creatorAlias, selectedFilter, onFiltersChange, searchParams]);

  // Bookmark dropdown handlers
  const handleBookmarkSelect = (bookmark: string) => {
    setSelectedBookmark(bookmark);
    setIsDropdownOpen(false);
    updateFilters({ bookmarkTitle: bookmark || undefined });
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
  const handleSortChange = (newSortBy: 'recent' | 'imports') => {
    setSelectedFilter(newSortBy);
    updateFilters({ sortBy: newSortBy, sortOrder: 'desc' });
  };

  const handleShuffle = () => {
    setSelectedFilter('shuffle');
    if (onShuffle) {
      onShuffle();
    }
  };

  // Clear all filters (reset to recent)
  const clearAllFilters = () => {
    setSelectedBookmark('');
    setCreatorAlias('');
    setSelectedFilter('recent');
    
    if (creatorInputRef.current) creatorInputRef.current.value = '';
    
    updateFilters({
      bookmarkTitle: undefined,
      creatorAlias: undefined,
      sortBy: 'recent',
      sortOrder: 'desc'
    });
  };

  // Fetch available bookmarks on mount
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setIsLoadingBookmarks(true);
        const bookmarks = await CommunityClientService.getCommunityBookmarks();
        setAvailableBookmarks(bookmarks);
      } catch (error) {
        console.error('Failed to fetch community bookmarks:', error);
        setAvailableBookmarks([]);
      } finally {
        setIsLoadingBookmarks(false);
      }
    };

    fetchBookmarks();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);


  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  // Check if any filters are active (only search filters, not sort)
  const hasActiveFilters = selectedBookmark || creatorAlias;

  return (
    <div className="bg-background border border-border rounded-lg p-4 mx-2 my-2">
      <div className="flex flex-col gap-4">
        {/* Main search row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bookmark title dropdown */}
          <div className="flex-1 min-w-[180px]">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full pl-3 pr-10 py-2 border border-input rounded-md bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent flex items-center justify-between"
                disabled={isLoading || isLoadingBookmarks}
              >
                <span className={selectedBookmark ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedBookmark || 'all bookmarks...'}
                </span>
                <ChevronDownIcon 
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-[256px] overflow-y-auto">
                  {isLoadingBookmarks ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <>
                      {/* All bookmarks option */}
                      <button
                        type="button"
                        onClick={() => handleBookmarkSelect('')}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted focus:bg-muted focus:outline-none"
                      >
                        <span className="text-muted-foreground">all bookmarks</span>
                      </button>
                      
                      {/* Available bookmark options */}
                      {availableBookmarks.map((bookmark) => (
                        <button
                          key={bookmark}
                          type="button"
                          onClick={() => handleBookmarkSelect(bookmark)}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-muted focus:bg-muted focus:outline-none ${
                            selectedBookmark === bookmark ? 'bg-muted' : ''
                          }`}
                        >
                          {bookmark}
                        </button>
                      ))}
                      
                      {availableBookmarks.length === 0 && !isLoadingBookmarks && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No bookmarks available</div>
                      )}
                    </>
                  )}
                </div>
              )}
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
                selectedFilter === 'recent' 
                  ? 'bg-white dark:bg-background text-foreground shadow-sm border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
              disabled={isLoading}
            >
              <ClockIcon className="h-4 w-4" />
              {!isMobile && 'Recent'}
            </button>
            <button
              onClick={() => handleSortChange('imports')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                selectedFilter === 'imports' 
                  ? 'bg-white dark:bg-background text-foreground shadow-sm border border-border/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
              disabled={isLoading}
            >
              <HeartIcon className="h-4 w-4" />
              {!isMobile && 'Imports'}
            </button>
            {onShuffle && (
              <button
                onClick={handleShuffle}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                  selectedFilter === 'shuffle' 
                    ? 'bg-white dark:bg-background text-foreground shadow-sm border border-border/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
                disabled={isLoading}
              >
                <ArrowsRightLeftIcon className="h-4 w-4" />
                {!isMobile && 'Shuffle'}
              </button>
            )}
          </div>

          {/* Clear search filters */}
          {/* {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
}
