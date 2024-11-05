import React from 'react';

interface DeleteGPTResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteGPTResponseModal: React.FC<DeleteGPTResponseModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg w-[300px] max-w-[70vw]">
        <h2 className="text-l font-bold mb-4">Delete Response</h2>
        <p className="mb-4">Are you sure you want to delete this response?</p>
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

export default DeleteGPTResponseModal;
