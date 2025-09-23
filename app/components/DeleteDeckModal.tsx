import React from 'react';
import ConfirmationModal from './ui/ConfirmationModal';

interface DeleteDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deckTitle: string;
}

const DeleteDeckModal: React.FC<DeleteDeckModalProps> = ({ isOpen, onClose, onConfirm, deckTitle }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Deck"
      message={`Are you sure you want to delete the deck "${deckTitle}" and all its contents?`}
      confirmText="Delete"
      cancelText="Cancel"
      confirmButtonColor="red"
    />
  );
};

export default DeleteDeckModal;
