import prisma from '../database/prisma';
import type { 
  AliasValidationResult, 
  AliasOperationResult, 
  UserAliasInfo,
  CommunityUserProfile 
} from '../../types/community';

/**
 * Validates if an alias is available and meets requirements
 */
export async function validateAlias(alias: string): Promise<AliasValidationResult> {
  try {
    // Check length requirements
    if (alias.length < 3) {
      return { isValid: false, error: 'Alias must be at least 3 characters long' };
    }
    
    if (alias.length > 20) {
      return { isValid: false, error: 'Alias must be 20 characters or less' };
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    const validAliasRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validAliasRegex.test(alias)) {
      return { isValid: false, error: 'Alias can only contain letters, numbers, underscores, and hyphens' };
    }

    // Check if alias is already taken
    const existingUser = await prisma.user.findUnique({
      where: { alias },
      select: { id: true }
    });

    if (existingUser) {
      return { isValid: false, error: 'This alias is already taken' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating alias:', error);
    return { isValid: false, error: 'Unable to validate alias. Please try again.' };
  }
}

/**
 * Creates or updates a user's alias
 */
export async function createAlias(userId: string, alias: string): Promise<AliasOperationResult> {
  try {
    // Validate alias first
    const validation = await validateAlias(alias);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Update user with new alias
    await prisma.user.update({
      where: { id: userId },
      data: {
        alias,
        isAliasPublic: true,
        aliasCreatedAt: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating alias:', error);
    return { success: false, error: 'Failed to create alias. Please try again.' };
  }
}

/**
 * Updates an existing alias
 */
export async function updateAlias(userId: string, newAlias: string): Promise<AliasOperationResult> {
  try {
    // Check if user has an existing alias
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { alias: true }
    });

    if (!user?.alias) {
      return { success: false, error: 'No existing alias found' };
    }

    // Validate new alias
    const validation = await validateAlias(newAlias);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Update user with new alias
    await prisma.user.update({
      where: { id: userId },
      data: {
        alias: newAlias,
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating alias:', error);
    return { success: false, error: 'Failed to update alias. Please try again.' };
  }
}

/**
 * Gets user's alias and public status
 */
export async function getUserAlias(userId: string): Promise<UserAliasInfo> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        alias: true,
        isAliasPublic: true
      }
    });

    return {
      alias: user?.alias || null,
      isPublic: user?.isAliasPublic || false
    };
  } catch (error) {
    console.error('Error getting user alias:', error);
    return { alias: null, isPublic: false };
  }
}

/**
 * Checks if user has a public alias (required for sharing to community)
 */
export async function hasPublicAlias(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        alias: true,
        isAliasPublic: true
      }
    });

    return !!(user?.alias && user?.isAliasPublic);
  } catch (error) {
    console.error('Error checking public alias:', error);
    return false;
  }
}

/**
 * Gets user profile information for community display
 */
export async function getCommunityProfile(userId: string): Promise<CommunityUserProfile | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        alias: true,
        isAliasPublic: true,
        createdAt: true
      }
    });

    if (!user?.alias || !user?.isAliasPublic) {
      return null;
    }

    // Get community stats
    const [communityStats, importStats] = await Promise.all([
      prisma.communityResponse.aggregate({
        where: { creatorUserId: userId, isActive: true },
        _count: { id: true },
        _sum: { importCount: true }
      }),
      prisma.communityResponse.findMany({
        where: { creatorUserId: userId, isActive: true },
        select: { languageId: true },
        distinct: ['languageId']
      })
    ]);

    return {
      alias: user.alias,
      totalShared: communityStats._count.id || 0,
      totalImports: communityStats._sum.importCount || 0,
      languagesShared: importStats.length,
      memberSince: user.createdAt
    };
  } catch (error) {
    console.error('Error getting community profile:', error);
    return null;
  }
}
