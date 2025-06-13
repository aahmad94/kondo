import React from 'react';
import ConfirmationModal from './ui/ConfirmationModal';

interface DeleteBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookmarkTitle: string;
}

const DeleteBookmarkModal: React.FC<DeleteBookmarkModalProps> = ({ isOpen, onClose, onConfirm, bookmarkTitle }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Bookmark"
      message={`Are you sure you want to delete the bookmark "${bookmarkTitle}" and all its contents?`}
      confirmText="Delete"
      cancelText="Cancel"
      confirmButtonColor="red"
    />
  );
};

export default DeleteBookmarkModal;
