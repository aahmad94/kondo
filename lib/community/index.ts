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
  importFromCommunityToBookmark,
  importEntireCommunityBookmark,
  getCommunityFeed,
  getUserSharingStats,
  isResponseShared,
  deleteCommunityResponse,
  checkGPTResponseDeletionImpact,
  deleteGPTResponseWithCascade
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
  CommunityResponseForFeed,
  CommunityImport
} from '../../types/community';
