'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommunityClientService } from '@/lib/community';
import type { 
  CommunityFilters, 
  CommunityPagination, 
  CommunityResponseWithRelations 
} from '@/lib/community';

interface UseCommunityFeedReturn {
  responses: CommunityResponseWithRelations[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (newFilters: Partial<CommunityFilters>) => void;
  filters: CommunityFilters;
  pagination: CommunityPagination;
}

export function useCommunityFeed(
  initialFilters: CommunityFilters = {},
  initialPagination: CommunityPagination = { page: 1, limit: 20 }
): UseCommunityFeedReturn {
  const [responses, setResponses] = useState<CommunityResponseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<CommunityFilters>(initialFilters);
  const [pagination, setPagination] = useState<CommunityPagination>(initialPagination);

  const fetchCommunityFeed = useCallback(async (
    currentFilters: CommunityFilters,
    currentPagination: CommunityPagination,
    append: boolean = false
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await CommunityClientService.getCommunityFeed(
        currentFilters,
        currentPagination
      );

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

  // Initial fetch and when filters change
  useEffect(() => {
    fetchCommunityFeed(filters, { ...pagination, page: 1 });
  }, [filters, fetchCommunityFeed]);

  const refetch = useCallback(async () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchCommunityFeed(filters, { ...pagination, page: 1 });
  }, [filters, pagination, fetchCommunityFeed]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      const nextPage = pagination.page + 1;
      setPagination(prev => ({ ...prev, page: nextPage }));
      await fetchCommunityFeed(filters, { ...pagination, page: nextPage }, true);
    }
  }, [hasMore, loading, filters, pagination, fetchCommunityFeed]);

  const updateFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  return {
    responses,
    loading,
    error,
    hasMore,
    totalCount,
    refetch,
    loadMore,
    updateFilters,
    filters,
    pagination
  };
}
