# Community Services

This module provides services for the community feed functionality, including sharing responses, importing responses, and managing user aliases.

## Services

### Alias Service (`aliasService.ts`)
- `validateAlias(alias: string)` - Validates alias format and availability
- `createAlias(userId: string, alias: string)` - Creates a new alias for user
- `updateAlias(userId: string, newAlias: string)` - Updates existing alias
- `getUserAlias(userId: string)` - Gets user's alias info
- `hasPublicAlias(userId: string)` - Checks if user has public alias (required for sharing)
- `getCommunityProfile(userId: string)` - Gets user's community profile stats

### Community Service (`communityService.ts`)
- `shareToCommunity(userId: string, responseId: string)` - Shares GPTResponse to community
- `importFromCommunity(userId: string, communityResponseId: string)` - Imports community response
- `getCommunityFeed(filters, pagination)` - Gets paginated community feed with filtering
- `getUserSharingStats(userId: string)` - Gets user's sharing statistics

## Key Features

### Sharing Flow
1. User must have a public alias before sharing
2. Creates CommunityResponse record with all response data
3. Prevents duplicate sharing of same response
4. Maintains link to original GPTResponse

### Import Flow
1. Checks if user already imported the response
2. Creates/finds bookmark with matching title in user's language
3. Creates new GPTResponse with `source: 'imported'`
4. Links imported response to community source
5. Tracks import in CommunityImport table
6. Increments import count on community response

### Data Integrity
- All operations use database transactions
- Proper foreign key relationships
- Prevents duplicate imports per user
- Maintains audit trail of all imports

## Usage Examples

```typescript
import { shareToCommunity, importFromCommunity, getCommunityFeed } from '@/lib/community';

// Share a response
const shareResult = await shareToCommunity(userId, responseId);
if (shareResult.success) {
  console.log('Shared to community!', shareResult.communityResponse);
}

// Import a response
const importResult = await importFromCommunity(userId, communityResponseId);
if (importResult.success) {
  console.log('Imported response!', importResult.response);
  console.log('Bookmark created?', importResult.wasBookmarkCreated);
}

// Get community feed
const feed = await getCommunityFeed(
  { languageId: 'ja', sortBy: 'popular' },
  { page: 1, limit: 20 }
);
```
