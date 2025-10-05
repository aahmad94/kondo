'use server'

import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { 
  shareToCommunity,
  importFromCommunity,
  importFromCommunityToBookmark,
  importEntireCommunityBookmark,
  createAlias,
  updateAlias,
  validateAlias,
  getUserSharingStats,
  isResponseShared,
  deleteCommunityResponse,
  checkGPTResponseDeletionImpact,
  deleteGPTResponseWithCascade
} from "@/lib/community";

/**
 * Server action to share a GPTResponse to the community feed
 */
export async function shareResponseToCommunityAction(responseId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to share responses' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await shareToCommunity(userId, responseId);
    
    if (result.success) {
      return {
        success: true,
        communityResponse: result.communityResponse,
        message: 'Response shared to community successfully'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to share response'
      };
    }
  } catch (error) {
    console.error('Error in shareResponseToCommunityAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share response to community'
    };
  }
}

/**
 * Server action to import a community response
 */
export async function importCommunityResponseAction(communityResponseId: string, timezone?: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to import responses' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await importFromCommunity(userId, communityResponseId, timezone);
    
    if (result.success) {
      return {
        success: true,
        response: result.response,
        bookmark: result.bookmark,
        wasBookmarkCreated: result.wasBookmarkCreated,
        streakData: result.streakData,
        message: result.wasBookmarkCreated 
          ? 'Response imported and new bookmark created!'
          : 'Response imported to existing bookmark!'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to import response'
      };
    }
  } catch (error) {
    console.error('Error in importCommunityResponseAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import community response'
    };
  }
}

/**
 * Server action to import a community response to a specific bookmark
 */
export async function importCommunityResponseToBookmarkAction(communityResponseId: string, targetBookmarkId: string, timezone?: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to import responses' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await importFromCommunityToBookmark(userId, communityResponseId, targetBookmarkId, timezone);
    return result;
  } catch (error) {
    console.error('Error in importCommunityResponseToBookmarkAction:', error);
    return { 
      success: false, 
      error: 'Failed to import response to bookmark' 
    };
  }
}

/**
 * Server action to create a user alias
 */
export async function createUserAliasAction(alias: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to create an alias' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await createAlias(userId, alias);
    
    if (result.success) {
      return {
        success: true,
        message: 'Alias created successfully! You can now share responses to the community.'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create alias'
      };
    }
  } catch (error) {
    console.error('Error in createUserAliasAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alias'
    };
  }
}

/**
 * Server action to update a user alias
 */
export async function updateUserAliasAction(newAlias: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to update your alias' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await updateAlias(userId, newAlias);
    
    if (result.success) {
      return {
        success: true,
        message: 'Alias updated successfully!'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to update alias'
      };
    }
  } catch (error) {
    console.error('Error in updateUserAliasAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update alias'
    };
  }
}

/**
 * Server action to validate an alias (for real-time validation)
 */
export async function validateAliasAction(alias: string) {
  try {
    const result = await validateAlias(alias);
    return result;
  } catch (error) {
    console.error('Error in validateAliasAction:', error);
    return {
      isValid: false,
      error: 'Unable to validate alias. Please try again.'
    };
  }
}

/**
 * Server action to check if a response has already been shared
 */
export async function checkResponseSharedAction(responseId: string) {
  try {
    const result = await isResponseShared(responseId);
    return {
      success: true,
      isShared: result.isShared,
      communityResponse: result.communityResponse
    };
  } catch (error) {
    console.error('Error in checkResponseSharedAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check sharing status'
    };
  }
}

/**
 * Server action to delete a community response
 */
export async function deleteCommunityResponseAction(communityResponseId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to delete responses' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await deleteCommunityResponse(userId, communityResponseId);
    
    if (result.success) {
      return {
        success: true,
        message: 'Response removed from community feed successfully!'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to delete response'
      };
    }
  } catch (error) {
    console.error('Error in deleteCommunityResponseAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete community response'
    };
  }
}

/**
 * Server action to get user's sharing statistics
 */
export async function getUserSharingStatsAction() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to view statistics' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const stats = await getUserSharingStats(userId);
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error in getUserSharingStatsAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sharing statistics'
    };
  }
}

/**
 * Server action to check deletion impact for a GPT response
 */
export async function checkGPTResponseDeletionImpactAction(responseId: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to check deletion impact' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await checkGPTResponseDeletionImpact(userId, responseId);
    
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Error in checkGPTResponseDeletionImpactAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check deletion impact'
    };
  }
}

/**
 * Server action to delete a GPT response with proper cascade handling
 */
export async function deleteGPTResponseWithCascadeAction(responseId: string, bookmarks?: Record<string, string>) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to delete responses' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await deleteGPTResponseWithCascade(userId, responseId, bookmarks);
    
    if (result.success) {
      return {
        success: true,
        message: 'Response deleted successfully!'
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to delete response'
      };
    }
  } catch (error) {
    console.error('Error in deleteGPTResponseWithCascadeAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete response'
    };
  }
}

/**
 * Server action to import an entire community bookmark
 */
export async function importEntireCommunityBookmarkAction(
  communityBookmarkTitle: string, 
  targetBookmarkId?: string,
  timezone?: string
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: 'Unauthorized: Please sign in to import bookmarks' 
      };
    }

    // Get userId from session - check both possible locations
    const userId = (session as any).userId || (session.user as any).id;
    if (!userId) {
      return { 
        success: false, 
        error: 'Unable to identify user' 
      };
    }

    const result = await importEntireCommunityBookmark(userId, communityBookmarkTitle, targetBookmarkId, timezone);
    
    if (result.success) {
      return {
        success: true,
        response: result.response,
        bookmark: result.bookmark,
        wasBookmarkCreated: result.wasBookmarkCreated,
        importedCount: result.importedCount,
        streakData: result.streakData,
        message: `Successfully imported ${result.importedCount} responses from "${communityBookmarkTitle}" bookmark!`
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to import bookmark'
      };
    }
  } catch (error) {
    console.error('Error in importEntireCommunityBookmarkAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import entire bookmark'
    };
  }
}
