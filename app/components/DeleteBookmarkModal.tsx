import React from 'react';

interface DeleteBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookmarkTitle: string;
}

const DeleteBookmarkModal: React.FC<DeleteBookmarkModalProps> = ({ isOpen, onClose, onConfirm, bookmarkTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-gray-800 text-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Delete Bookmark</h2>
        <p className="mb-4">Are you sure you want to delete the bookmark &quot;{bookmarkTitle}&quot; and all its contents?</p>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded mr-2 hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBookmarkModal;
