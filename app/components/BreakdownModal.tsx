import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: string;
}

const BreakdownModal: React.FC<BreakdownModalProps> = ({ isOpen, onClose, breakdown }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-[#111111] p-6 rounded-sm w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center sticky top-0 bg-[#111111] pb-4">
          <h2 className="text-l font-bold" style={{ color: '#b59f3b' }}>Breakdown</h2>
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity duration-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="text-[#b59f3b] whitespace-pre-wrap overflow-y-auto">
          <Markdown remarkPlugins={[remarkGfm]} className="overflow-hidden">
            {breakdown}
          </Markdown>
        </div>
      </div>
    </div>
  );
};

export default BreakdownModal; 