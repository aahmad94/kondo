// Alias management
export {
  validateAlias,
  createAlias,
  updateAlias,
  getUserAlias,
  hasPublicAlias,
  getCommunityProfile
} from './aliasService';

// Community sharing and importing
export {
  shareToCommunity,
  importFromCommunity,
  getCommunityFeed,
  getUserSharingStats,
  isResponseShared
} from './communityService';

// Client-side API service
export { CommunityClientService } from './communityClientService';

// Types
export type { 
  CommunityFilters, 
  CommunityPagination,
  ShareToCommunityResponse,
  ImportFromCommunityResponse,
  CommunityFeedResponse,
  UserSharingStats,
  AliasValidationResult,
  AliasOperationResult,
  UserAliasInfo,
  CommunityUserProfile,
  CommunityResponse,
  CommunityResponseWithRelations,
  CommunityImport
} from '../../types/community';
