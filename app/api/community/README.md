# Community API Endpoints

This directory contains the API endpoints for the community feed functionality.

## Server Actions (for mutations)

Located in `/actions/community.ts`:

### `shareResponseToCommunityAction(responseId: string)`
- Shares a GPTResponse to the community feed
- Requires authentication and user alias
- Returns: `{ success: boolean; communityResponse?: any; error?: string; message?: string }`

### `importCommunityResponseAction(communityResponseId: string)`
- Imports a community response to user's library
- Creates bookmark if needed
- Returns: `{ success: boolean; response?: any; bookmark?: any; wasBookmarkCreated?: boolean; error?: string; message?: string }`

### `createUserAliasAction(alias: string)`
- Creates a new user alias
- Validates alias format and uniqueness
- Returns: `{ success: boolean; error?: string; message?: string }`

### `updateUserAliasAction(newAlias: string)`
- Updates existing user alias
- Returns: `{ success: boolean; error?: string; message?: string }`

### `validateAliasAction(alias: string)`
- Validates alias without creating it
- Returns: `{ isValid: boolean; error?: string }`

### `getUserSharingStatsAction()`
- Gets user's sharing statistics
- Returns: `{ success: boolean; stats?: UserSharingStats; error?: string }`

## API Routes (for queries)

### GET `/api/community/feed`
Fetches the community feed with filtering and pagination. **Automatically scoped to user's current language.**

**Authentication:** Required - uses session to determine user's language preference.

**Query Parameters:**
- `bookmarkTitle` (string, optional): Filter by bookmark title
- `creatorAlias` (string, optional): Filter by creator alias
- `minImports` (number, optional): Minimum import count
- `sortBy` ('recent' | 'popular' | 'imports', default: 'recent'): Sort criteria
- `sortOrder` ('asc' | 'desc', default: 'desc'): Sort direction
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page

**Note:** Language filtering is automatic - only shows responses in the user's currently selected language.

**Response:**
```json
{
  "success": true,
  "data": {
    "responses": [/* CommunityResponseWithRelations[] */],
    "totalCount": 150,
    "hasMore": true
  },
  "filters": {/* applied filters */},
  "pagination": {/* pagination info */}
}
```

### GET `/api/community/user`
Gets current user's alias and profile information.

**Query Parameters:**
- `includeProfile` (boolean, optional): Include community profile stats

**Response:**
```json
{
  "success": true,
  "alias": "user123",
  "isPublic": true,
  "profile": {/* CommunityUserProfile if requested */}
}
```

### GET `/api/community/profile/[userId]`
Gets public community profile for a specific user.

**Response:**
```json
{
  "success": true,
  "profile": {
    "alias": "user123",
    "totalShared": 25,
    "totalImports": 150,
    "languagesShared": 3,
    "memberSince": "2024-01-15T00:00:00Z"
  }
}
```

**Note:** Language selection is handled automatically based on user preferences. No manual language filtering API is needed.

## Client Service

Use `CommunityClientService` from `@/lib/community` for type-safe API interactions:

```typescript
import { CommunityClientService } from '@/lib/community';

// Get community feed (automatically filtered by user's current language)
const feed = await CommunityClientService.getCommunityFeed(
  { sortBy: 'popular' }, // No languageId needed
  { page: 1, limit: 20 }
);

// Get current user info
const userInfo = await CommunityClientService.getCurrentUserInfo(true);

// Note: No manual language selection needed - feed automatically uses user's current language
```

## React Hooks

### `useCommunityFeed(filters?, pagination?)`
Hook for managing community feed state with filtering and pagination.

### `useUserAlias()`
Hook for managing user alias and community profile data.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (not signed in)
- `404`: Not found
- `500`: Server error
