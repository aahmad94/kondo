// Community Response types
export interface CommunityResponse {
  id: string;
  originalResponseId: string;
  creatorAlias: string;
  creatorUserId: string;
  bookmarkTitle: string;
  languageId: string;
  content: string;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  furigana?: string | null;
  audio?: string | null;
  audioMimeType?: string | null;
  responseType?: 'clarification' | 'response' | 'instruction';
  isActive: boolean;
  importCount: number;
  sharedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityResponseWithRelations extends CommunityResponse {
  creator: {
    alias: string | null;
  };
  language: {
    code: string;
    name: string;
  };
}

export interface CommunityResponseForFeed extends CommunityResponseWithRelations {
  hasUserImported: boolean;
}

// Community Import types
export interface CommunityImport {
  id: string;
  userId: string;
  communityResponseId: string;
  importedResponseId: string;
  importedBookmarkId: string;
  wasBookmarkCreated: boolean;
  importedAt: Date;
}

// Filter and pagination types
export interface CommunityFilters {
  deckTitle?: string;
  creatorAlias?: string;
  languageId?: string; // Set automatically by API based on user's current language
  minImports?: number;
  sortBy?: 'recent' | 'imports';
  sortOrder?: 'asc' | 'desc';
}

export interface CommunityPagination {
  page: number;
  limit: number;
}

// User profile types
export interface CommunityUserProfile {
  alias: string;
  totalShared: number;
  totalImports: number;
  languagesShared: number;
  memberSince: Date;
}

export interface UserSharingStats {
  totalLocal: number;
  totalImported: number;
  totalShared: number;
  totalImportsByOthers: number;
}

// API Response types
export interface ShareToCommunityResponse {
  success: boolean;
  communityResponse?: CommunityResponseWithRelations;
  error?: string;
}

export interface ImportFromCommunityResponse {
  success: boolean;
  response?: any; // GPTResponse with relations
  bookmark?: any; // Bookmark
  wasBookmarkCreated?: boolean;
  importedCount?: number; // For bulk imports
  streakData?: {
    currentStreak: number;
    maxStreak: number;
    lastActivityDate: Date | null;
    isNewStreak: boolean;
    wasStreakBroken: boolean;
  };
  error?: string;
}

export interface CommunityFeedResponse {
  responses: CommunityResponseForFeed[];
  totalCount: number;
  hasMore: boolean;
}

// Alias management types
export interface AliasValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AliasOperationResult {
  success: boolean;
  error?: string;
}

export interface UserAliasInfo {
  alias: string | null;
  isPublic: boolean;
}
