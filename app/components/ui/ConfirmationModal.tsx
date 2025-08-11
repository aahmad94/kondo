import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'blue' | 'green';
  showCloseButton?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = 'red',
  showCloseButton = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getConfirmButtonClasses = () => {
    const baseClasses = 'px-4 py-2 text-white rounded-sm transition-colors duration-200';
    switch (confirmButtonColor) {
      case 'red':
        return `${baseClasses} bg-red-500 hover:bg-red-600`;
      case 'blue':
        return `${baseClasses} bg-blue-500 hover:bg-blue-600`;
      case 'green':
        return `${baseClasses} bg-green-500 hover:bg-green-600`;
      default:
        return `${baseClasses} bg-red-500 hover:bg-red-600`;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
      <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l text-card-foreground">{title}</h2>
          {showCloseButton && (
            <button onClick={onClose} className="text-card-foreground hover:text-muted-foreground transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        
        <p className="mb-4 text-card-foreground">{message}</p>
        
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-sm hover:bg-secondary/80 transition-colors duration-200"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={getConfirmButtonClasses()}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 