'use client';

import React from 'react';
import { UserPlusIcon, PencilIcon } from '@heroicons/react/24/outline';

interface AliasPromptProps {
  hasAlias: boolean;
  currentAlias?: string | null;
  onCreateAlias: () => void;
  onEditAlias?: () => void;
  className?: string;
}

export default function AliasPrompt({ 
  hasAlias, 
  currentAlias, 
  onCreateAlias, 
  onEditAlias,
  className = '' 
}: AliasPromptProps) {
  
  if (hasAlias && currentAlias) {
    // User has alias - show current alias with edit option
    return (
      <div className={`flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg ${className}`}>
        <div className="flex-1">
          <p className="text-sm text-green-800 dark:text-green-200">
            <span className="font-medium">Your alias:</span> @{currentAlias}
          </p>
          <p className="text-xs text-green-600 dark:text-green-300 mt-1">
            Ready to share to community feed!
          </p>
        </div>
        {onEditAlias && (
          <button
            onClick={onEditAlias}
            className="flex items-center gap-1 px-3 py-1 text-xs text-green-700 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200 transition-colors"
          >
            <PencilIcon className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>
    );
  }

  // User doesn't have alias - show creation prompt
  return (
    <div className={`flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}>
      <div className="flex-1">
        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
          Create an alias to share with the community
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
          Choose a unique name that will represent you when sharing responses.
        </p>
      </div>
      <button
        onClick={onCreateAlias}
        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
      >
        <UserPlusIcon className="h-4 w-4" />
        Create Alias
      </button>
    </div>
  );
}
