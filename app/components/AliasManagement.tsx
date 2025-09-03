'use client';

import React, { useState } from 'react';
import { UserIcon, PencilIcon, ShareIcon } from '@heroicons/react/24/outline';
import CreateAliasModal from './CreateAliasModal';
import EditAliasModal from './EditAliasModal';
import { useUserAlias } from '../hooks/useUserAlias';

export default function AliasManagement() {
  const { 
    alias, 
    isPublic, 
    profile, 
    stats, 
    loading, 
    error, 
    createAlias, 
    updateAlias,
    refreshData 
  } = useUserAlias();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAliasCreated = (newAlias: string) => {
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleAliasUpdated = (newAlias: string) => {
    setIsEditModalOpen(false);
    refreshData();
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-destructive text-sm">
          Error loading alias information: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <UserIcon className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium text-card-foreground">Community Alias</h3>
      </div>

      {alias && isPublic ? (
        // User has alias
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                @{alias}
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                Your community alias
              </p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1 text-xs text-green-700 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200 transition-colors"
            >
              <PencilIcon className="h-3 w-3" />
              Edit
            </button>
          </div>

          {/* Community stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalLocal}</div>
                <div className="text-xs text-muted-foreground">Created</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalImported}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalShared}</div>
                <div className="text-xs text-muted-foreground">Shared</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalImportsByOthers}</div>
                <div className="text-xs text-muted-foreground">Total Imports</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShareIcon className="h-4 w-4" />
            <span>You can share your responses to the community feed</span>
          </div>
        </div>
      ) : (
        // User doesn't have alias
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
              No community alias set
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
              Create an alias to share your responses with the community and help other learners.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              Create Alias
            </button>
          </div>

          {/* Show stats even without alias */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalLocal}</div>
                <div className="text-xs text-muted-foreground">Responses Created</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold text-card-foreground">{stats.totalImported}</div>
                <div className="text-xs text-muted-foreground">Responses Imported</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateAliasModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAliasCreated={handleAliasCreated}
      />

      <EditAliasModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAliasUpdated={handleAliasUpdated}
        currentAlias={alias || ''}
      />
    </div>
  );
}
