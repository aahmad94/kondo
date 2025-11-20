'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CommunityClientService } from '@/lib/community';
import type { 
  CommunityFilters, 
  CommunityPagination, 
  CommunityResponseForFeed
} from '@/lib/community';

interface UseCommunityFeedReturn {
  responses: CommunityResponseForFeed[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  refetch: () => Promise<void>;
  refetchFresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (newFilters: Partial<CommunityFilters>) => void;
  updateResponse: (responseId: string, updates: Partial<CommunityResponseForFeed>) => void;
  shuffleResponses: () => void;
  filters: CommunityFilters;
  pagination: CommunityPagination;
  isShuffled: boolean;
}

export function useCommunityFeed(
  initialFilters: CommunityFilters = {},
  initialPagination: CommunityPagination = { page: 1, limit: 20 }
): UseCommunityFeedReturn {
  const [responses, setResponses] = useState<CommunityResponseForFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<CommunityFilters>(initialFilters);
  const [pagination, setPagination] = useState<CommunityPagination>(initialPagination);
  const [isShuffled, setIsShuffled] = useState(false);
  const isShuffledRef = useRef(false); // Track shuffled state in ref for closure access

  // Keep ref in sync with state
  useEffect(() => {
    isShuffledRef.current = isShuffled;
  }, [isShuffled]);

  const fetchCommunityFeed = useCallback(async (
    currentFilters: CommunityFilters,
    currentPagination: CommunityPagination,
    append: boolean = false,
    force: boolean = false // Allow forcing fetch even when shuffled
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Capture shuffled state at fetch start for race condition detection
      const wasShuffledAtStart = isShuffledRef.current;

      const result = await CommunityClientService.getCommunityFeed(
        currentFilters,
        currentPagination
      );

      // RACE CONDITION PROTECTION: Check shuffled state again after fetch completes
      // This is critical because shuffle might have happened while the fetch was in flight.
      // If a fetch started before shuffle but completes after, we must not overwrite the shuffled array.
      const isShuffledNow = isShuffledRef.current;
      const shuffleHappenedDuringFetch = isShuffledNow && !wasShuffledAtStart;

      // CRITICAL: If shuffle happened during the fetch, ALWAYS skip overwriting
      // This prevents race conditions where a fetch started with force=true before shuffle,
      // but completes after shuffle has already occurred. We prioritize preserving shuffle
      // over honoring the original force flag.
      if (shuffleHappenedDuringFetch) {
        // Update metadata but preserve shuffled responses
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setLoading(false);
        return;
      }

      // Don't overwrite shuffled responses unless explicitly forced
      if (isShuffledNow && !force && !append) {
        // Update metadata but preserve shuffled responses
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setLoading(false);
        return;
      }

      if (append) {
        setResponses(prev => [...prev, ...result.responses]);
      } else {
        setResponses(result.responses);
      }

      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch community feed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track previous filters to detect actual filter changes (not just sortBy when shuffled)
  const prevFiltersRef = useRef<CommunityFilters>(filters);
  const prevPaginationRef = useRef<CommunityPagination>(pagination);
  const isInitialMount = useRef(true);
  const isRefetchingFreshRef = useRef(false); // Track if refetchFresh is in progress
  
  // Initial fetch and when filters change
  useEffect(() => {
    // Always fetch on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchCommunityFeed(filters, { ...pagination, page: 1 });
      prevFiltersRef.current = filters;
      prevPaginationRef.current = pagination;
      return;
    }
    
    // Skip if refetchFresh is handling the fetch (prevents double-fetch)
    if (isRefetchingFreshRef.current) {
      isRefetchingFreshRef.current = false;
      prevFiltersRef.current = filters;
      prevPaginationRef.current = pagination;
      return;
    }
    
    // SHUFFLE PRESERVATION: Don't refetch if we're in shuffled mode - preserve the shuffled order
    // UNLESS actual filter values changed (deckTitle, creatorAlias, etc.)
    // This allows users to change sortBy without losing shuffle, but refetches when filtering
    if (isShuffled) {
      const prevFilters = prevFiltersRef.current;
      // Check if real filters changed (not just sortBy)
      // Note: sortBy changes are handled in updateFilters() which clears isShuffled
      const realFiltersChanged = 
        prevFilters.deckTitle !== filters.deckTitle ||
        prevFilters.creatorAlias !== filters.creatorAlias ||
        prevFilters.minImports !== filters.minImports ||
        prevFilters.languageId !== filters.languageId;
      
      // Only refetch if real filters changed, not just sortBy or pagination
      if (!realFiltersChanged) {
        // Skip refetch to preserve shuffle - only sortBy or pagination changed
        prevFiltersRef.current = filters;
        prevPaginationRef.current = pagination;
        return;
      }
      // Real filters changed - proceed with refetch (shuffle will be cleared)
    }
    
    // Refetch if not shuffled, or if real filters changed
    // Force fetch when not shuffled to ensure fresh data
    fetchCommunityFeed(filters, { ...pagination, page: 1 }, false, !isShuffled);
    prevFiltersRef.current = filters;
    prevPaginationRef.current = pagination;
  }, [filters, fetchCommunityFeed, isShuffled, pagination]);

  const refetch = useCallback(async () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setIsShuffled(false); // Clear shuffle state on refetch
    await fetchCommunityFeed(filters, { ...pagination, page: 1 }, false, true);
  }, [filters, pagination, fetchCommunityFeed]);

  const refetchFresh = useCallback(async () => {
    // Always fetch fresh data, ignoring any caching
    // Set flag to prevent useEffect from triggering a duplicate fetch
    isRefetchingFreshRef.current = true;
    // Update refs FIRST to prevent useEffect from triggering
    const emptyFilters = {};
    const freshPagination = { page: 1, limit: 20 };
    prevFiltersRef.current = emptyFilters;
    prevPaginationRef.current = freshPagination;
    // Clear shuffle state and reset filters/pagination
    setIsShuffled(false);
    setFilters(emptyFilters);
    setPagination(freshPagination);
    // Directly fetch without waiting for useEffect to trigger
    // Force the fetch to overwrite any existing responses
    await fetchCommunityFeed(emptyFilters, freshPagination, false, true);
  }, [fetchCommunityFeed]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      const nextPage = pagination.page + 1;
      setPagination(prev => ({ ...prev, page: nextPage }));
      await fetchCommunityFeed(filters, { ...pagination, page: nextPage }, true);
    }
  }, [hasMore, loading, filters, pagination, fetchCommunityFeed]);

  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      // Clear shuffle state if:
      // 1. Real filters changed (deckTitle, creatorAlias, etc.), OR
      // 2. sortBy changed (user switching from shuffle to recent/imports)
      // This ensures that when users switch to a real sort order, we refetch with that order
      const realFiltersChanged = 
        prev.deckTitle !== updated.deckTitle ||
        prev.creatorAlias !== updated.creatorAlias ||
        prev.minImports !== updated.minImports ||
        prev.languageId !== updated.languageId;
      
      const sortByChanged = prev.sortBy !== updated.sortBy;
      
      if (realFiltersChanged || sortByChanged) {
        setIsShuffled(false); // Clear shuffle state when filters or sortBy change
      }
      return updated;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const updateResponse = useCallback((responseId: string, updates: Partial<CommunityResponseForFeed>) => {
    setResponses(prev => prev.map(response => 
      response.id === responseId 
        ? { ...response, ...updates }
        : response
    ));
  }, []);

  const shuffleResponses = useCallback(() => {
    // Set shuffled flag FIRST to prevent any refetches during shuffle operation
    // This is important for race condition protection - if a fetch is in flight,
    // setting isShuffled=true here will cause fetchCommunityFeed to skip overwriting
    setIsShuffled(true);
    setResponses(prev => {
      // Fisher-Yates shuffle algorithm
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  return {
    responses,
    loading,
    error,
    hasMore,
    totalCount,
    refetch,
    refetchFresh,
    loadMore,
    updateFilters,
    updateResponse,
    shuffleResponses,
    filters,
    pagination,
    isShuffled
  };
}
