import type { 
  CommunityFilters, 
  CommunityPagination, 
  CommunityFeedResponse,
  CommunityUserProfile 
} from '../../types/community';

/**
 * Client-side service for community API interactions
 */
export class CommunityClientService {
  
  /**
   * Fetches the community feed with filtering and pagination
   */
  static async getCommunityFeed(
    filters: CommunityFilters = {}, 
    pagination: CommunityPagination = { page: 1, limit: 20 }
  ): Promise<CommunityFeedResponse> {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (filters.bookmarkTitle) queryParams.set('bookmarkTitle', filters.bookmarkTitle);
    if (filters.creatorAlias) queryParams.set('creatorAlias', filters.creatorAlias);
    // Note: languageId is automatically set by the API based on user's preference
    if (filters.minImports) queryParams.set('minImports', filters.minImports.toString());
    if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
    
    // Add pagination to query params
    queryParams.set('page', pagination.page.toString());
    queryParams.set('limit', pagination.limit.toString());

    const response = await fetch(`/api/community/feed?${queryParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch community feed');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Gets current user's alias and profile information
   */
  static async getCurrentUserInfo(includeProfile: boolean = false): Promise<{
    alias: string | null;
    isPublic: boolean;
    profile?: CommunityUserProfile | null;
  }> {
    const queryParams = includeProfile ? '?includeProfile=true' : '';
    const response = await fetch(`/api/community/user${queryParams}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user information');
    }

    return await response.json();
  }

  /**
   * Gets a community profile for a specific user
   */
  static async getCommunityProfile(userId: string): Promise<CommunityUserProfile> {
    const response = await fetch(`/api/community/profile/${userId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user profile');
    }

    const result = await response.json();
    return result.profile;
  }

  // Note: Language filtering is automatic based on user's current language preference
  // No manual language selection needed for community feed

  /**
   * Helper method to build filter query string for URLs
   */
  static buildFilterQueryString(filters: CommunityFilters, pagination?: CommunityPagination): string {
    const queryParams = new URLSearchParams();
    
    if (filters.bookmarkTitle) queryParams.set('bookmarkTitle', filters.bookmarkTitle);
    if (filters.creatorAlias) queryParams.set('creatorAlias', filters.creatorAlias);
    // Note: languageId is automatically set by the API based on user's preference
    if (filters.minImports) queryParams.set('minImports', filters.minImports.toString());
    if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
    
    if (pagination) {
      queryParams.set('page', pagination.page.toString());
      queryParams.set('limit', pagination.limit.toString());
    }

    return queryParams.toString();
  }

  /**
   * Helper method to parse filters from URL search params
   */
  static parseFiltersFromURL(searchParams: URLSearchParams): { 
    filters: CommunityFilters; 
    pagination: CommunityPagination 
  } {
    const filters: CommunityFilters = {
      bookmarkTitle: searchParams.get('bookmarkTitle') || undefined,
      creatorAlias: searchParams.get('creatorAlias') || undefined,
      // Note: languageId is automatically set by the API based on user's preference
      minImports: searchParams.get('minImports') ? parseInt(searchParams.get('minImports')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'recent' | 'popular' | 'imports') || 'recent',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    const pagination: CommunityPagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    return { filters, pagination };
  }
}
