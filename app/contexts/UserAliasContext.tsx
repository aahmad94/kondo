'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CommunityClientService } from '@/lib/community';
import { 
  createUserAliasAction, 
  updateUserAliasAction, 
  validateAliasAction,
  getUserSharingStatsAction
} from '@/actions/community';
import type { CommunityUserProfile, UserSharingStats } from '@/lib/community';

interface UserAliasContextType {
  alias: string | null;
  isPublic: boolean;
  profile: CommunityUserProfile | null;
  stats: UserSharingStats | null;
  loading: boolean;
  error: string | null;
  createAlias: (alias: string) => Promise<boolean>;
  updateAlias: (newAlias: string) => Promise<boolean>;
  validateAlias: (alias: string) => Promise<{ isValid: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const UserAliasContext = createContext<UserAliasContextType | undefined>(undefined);

export function UserAliasProvider({ children }: { children: React.ReactNode }) {
  const [alias, setAlias] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [profile, setProfile] = useState<CommunityUserProfile | null>(null);
  const [stats, setStats] = useState<UserSharingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user alias and profile info
      const userInfo = await CommunityClientService.getCurrentUserInfo(true);
      setAlias(userInfo.alias);
      setIsPublic(userInfo.isPublic);
      setProfile(userInfo.profile || null);

      // Fetch sharing stats
      const statsResult = await getUserSharingStatsAction();
      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const createAlias = useCallback(async (newAlias: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await createUserAliasAction(newAlias);
      
      if (result.success) {
        setAlias(newAlias);
        setIsPublic(true);
        // Refresh profile data
        await fetchUserData();
        return true;
      } else {
        setError(result.error || 'Failed to create alias');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alias');
      return false;
    }
  }, [fetchUserData]);

  const updateAlias = useCallback(async (newAlias: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await updateUserAliasAction(newAlias);
      
      if (result.success) {
        setAlias(newAlias);
        // Refresh profile data
        await fetchUserData();
        return true;
      } else {
        setError(result.error || 'Failed to update alias');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alias');
      return false;
    }
  }, [fetchUserData]);

  const validateAlias = useCallback(async (aliasToValidate: string) => {
    try {
      return await validateAliasAction(aliasToValidate);
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Failed to validate alias'
      };
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  const value: UserAliasContextType = {
    alias,
    isPublic,
    profile,
    stats,
    loading,
    error,
    createAlias,
    updateAlias,
    validateAlias,
    refreshData
  };

  return (
    <UserAliasContext.Provider value={value}>
      {children}
    </UserAliasContext.Provider>
  );
}

export function useUserAlias(): UserAliasContextType {
  const context = useContext(UserAliasContext);
  if (!context) {
    throw new Error('useUserAlias must be used within a UserAliasProvider');
  }
  return context;
}
