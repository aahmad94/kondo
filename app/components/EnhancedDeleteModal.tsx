'use client';

import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface EnhancedDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  importCount: number;
  importerCount: number;
  isDeleting?: boolean;
}

const EnhancedDeleteModal: React.FC<EnhancedDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  importCount,
  importerCount,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Delete Shared Response
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This response has been shared to the community feed and imported by other users.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
            <div className="text-sm text-red-800 dark:text-red-200">
              <ul className="list-disc list-inside space-y-1">
                <li>The response will be completely removed from the community feed</li>
                <li>
                  <strong>{importerCount}</strong> {importerCount === 1 ? 'user' : 'users'} will lose access to this response from their bookmarks
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDeleteModal;
