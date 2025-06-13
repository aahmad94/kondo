import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function FormModal({
  isOpen,
  onClose,
  title,
  children
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
      <div className="bg-gray-800 p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l text-white">{title}</h2>
          <button onClick={onClose} className="text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
} 