import React from 'react';
import ConfirmationModal from './ui/ConfirmationModal';

interface DeleteGPTResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteGPTResponseModal: React.FC<DeleteGPTResponseModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Response"
      message="Are you sure you want to delete this response?"
      confirmText="Delete"
      cancelText="Cancel"
      confirmButtonColor="red"
    />
  );
};

export default DeleteGPTResponseModal;
