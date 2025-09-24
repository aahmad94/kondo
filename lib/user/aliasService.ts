import { prisma } from '@/lib/database/prisma';
import { UserAlias, User } from '@prisma/client';

export interface CreateAliasResult {
  success: boolean;
  alias?: UserAlias;
  error?: string;
}

export interface SwitchAliasResult {
  success: boolean;
  alias?: UserAlias;
  error?: string;
}

export interface AliasAvailabilityResult {
  available: boolean;
  ownedByUser: boolean;
  alias?: UserAlias;
}

/**
 * Check if an alias is available for a user to create or switch to
 */
export async function checkAliasAvailability(
  alias: string,
  userId: string
): Promise<AliasAvailabilityResult> {
  try {
    const existingAlias = await prisma.userAlias.findUnique({
      where: { alias },
      include: { user: true }
    });

    if (!existingAlias) {
      return { available: true, ownedByUser: false };
    }

    // If the alias exists and belongs to the current user, they can switch to it
    if (existingAlias.userId === userId) {
      return { 
        available: true, 
        ownedByUser: true, 
        alias: existingAlias 
      };
    }

    // If the alias exists and belongs to another user, it's not available
    return { available: false, ownedByUser: false };
  } catch (error) {
    console.error('Error checking alias availability:', error);
    return { available: false, ownedByUser: false };
  }
}

/**
 * Create a new alias for a user
 */
export async function createUserAlias(
  userId: string,
  alias: string,
  setAsCurrent: boolean = true
): Promise<CreateAliasResult> {
  try {
    // Validate alias format (basic validation)
    if (!alias || alias.trim().length === 0) {
      return { success: false, error: 'Alias cannot be empty' };
    }

    if (alias.length > 50) {
      return { success: false, error: 'Alias cannot be longer than 50 characters' };
    }

    // Check if alias is available
    const availability = await checkAliasAvailability(alias, userId);
    
    if (!availability.available) {
      return { success: false, error: 'This alias is already taken by another user' };
    }

    // If the alias already exists for this user, just switch to it
    if (availability.ownedByUser && availability.alias) {
      if (setAsCurrent) {
        const result = await switchToAlias(userId, alias);
        return {
          success: result.success,
          alias: result.alias,
          error: result.error
        };
      }
      return { success: true, alias: availability.alias };
    }

    // Create new alias
    const result = await prisma.$transaction(async (tx) => {
      // Create the new alias
      const newAlias = await tx.userAlias.create({
        data: {
          userId,
          alias,
          isCurrentlyActive: setAsCurrent
        }
      });

      if (setAsCurrent) {
        // Deactivate all other aliases for this user
        await tx.userAlias.updateMany({
          where: {
            userId,
            id: { not: newAlias.id }
          },
          data: { isCurrentlyActive: false }
        });

        // Update user's current alias reference and legacy alias field
        await tx.user.update({
          where: { id: userId },
          data: {
            currentAliasId: newAlias.id,
            alias: alias, // Keep legacy field in sync
            isAliasPublic: true,
            aliasCreatedAt: new Date()
          }
        });
      }

      return newAlias;
    });

    return { success: true, alias: result };
  } catch (error) {
    console.error('Error creating user alias:', error);
    return { success: false, error: 'Failed to create alias' };
  }
}

/**
 * Switch to an existing alias owned by the user
 */
export async function switchToAlias(
  userId: string,
  alias: string
): Promise<SwitchAliasResult> {
  try {
    // Check if the user owns this alias
    const userAlias = await prisma.userAlias.findFirst({
      where: {
        userId,
        alias
      }
    });

    if (!userAlias) {
      return { success: false, error: 'You do not own this alias' };
    }

    // Switch to this alias
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all other aliases for this user
      await tx.userAlias.updateMany({
        where: {
          userId,
          id: { not: userAlias.id }
        },
        data: { isCurrentlyActive: false }
      });

      // Activate the target alias
      const updatedAlias = await tx.userAlias.update({
        where: { id: userAlias.id },
        data: { isCurrentlyActive: true }
      });

      // Update user's current alias reference and legacy alias field
      await tx.user.update({
        where: { id: userId },
        data: {
          currentAliasId: userAlias.id,
          alias: alias, // Keep legacy field in sync
          isAliasPublic: true
        }
      });

      return updatedAlias;
    });

    return { success: true, alias: result };
  } catch (error) {
    console.error('Error switching to alias:', error);
    return { success: false, error: 'Failed to switch alias' };
  }
}

/**
 * Get all aliases owned by a user
 */
export async function getUserAliases(userId: string): Promise<UserAlias[]> {
  try {
    return await prisma.userAlias.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching user aliases:', error);
    return [];
  }
}

/**
 * Get the current active alias for a user
 */
export async function getCurrentUserAlias(userId: string): Promise<UserAlias | null> {
  try {
    return await prisma.userAlias.findFirst({
      where: {
        userId,
        isCurrentlyActive: true
      }
    });
  } catch (error) {
    console.error('Error fetching current user alias:', error);
    return null;
  }
}

/**
 * Get user with their current alias
 */
export async function getUserWithCurrentAlias(userId: string): Promise<(User & { currentAlias?: UserAlias }) | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        currentAlias: true
      }
    });
  } catch (error) {
    console.error('Error fetching user with current alias:', error);
    return null;
  }
}

/**
 * Validate alias format
 */
export function validateAliasFormat(alias: string): { valid: boolean; error?: string } {
  if (!alias || alias.trim().length === 0) {
    return { valid: false, error: 'Alias cannot be empty' };
  }

  if (alias.length < 2) {
    return { valid: false, error: 'Alias must be at least 2 characters long' };
  }

  if (alias.length > 50) {
    return { valid: false, error: 'Alias cannot be longer than 50 characters' };
  }

  // Check for valid characters (alphanumeric, underscore, hyphen)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(alias)) {
    return { valid: false, error: 'Alias can only contain letters, numbers, underscores, and hyphens' };
  }

  // Prevent aliases that start or end with special characters
  if (alias.startsWith('_') || alias.startsWith('-') || alias.endsWith('_') || alias.endsWith('-')) {
    return { valid: false, error: 'Alias cannot start or end with underscore or hyphen' };
  }

  return { valid: true };
}

/**
 * Get alias statistics for a user
 */
export async function getAliasStats(userId: string): Promise<{
  totalAliases: number;
  currentAlias: string | null;
  createdAt: Date | null;
}> {
  try {
    const [aliases, currentAlias] = await Promise.all([
      getUserAliases(userId),
      getCurrentUserAlias(userId)
    ]);

    return {
      totalAliases: aliases.length,
      currentAlias: currentAlias?.alias || null,
      createdAt: currentAlias?.createdAt || null
    };
  } catch (error) {
    console.error('Error fetching alias stats:', error);
    return {
      totalAliases: 0,
      currentAlias: null,
      createdAt: null
    };
  }
}
