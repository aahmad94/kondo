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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[60]">
      <div className="bg-card border border-border p-6 rounded-sm w-[400px] max-w-[70vw] max-h-[70vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l text-card-foreground">{title}</h2>
          <button onClick={onClose} className="text-card-foreground hover:text-muted-foreground transition-colors duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
} 