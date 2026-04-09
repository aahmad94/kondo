'use client';

import React from 'react';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end justify-center z-[70] pb-8 px-4">
      <div className="bg-card rounded-xl p-6 w-full max-w-sm border border-border shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">Add to Home Screen</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-card-foreground text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Install Kondo on your home screen for quick access — no App Store required.
        </p>

        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
              1
            </span>
            <span className="text-sm text-card-foreground">
              Tap the{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                Share
                {/* Safari share icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 inline"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>{' '}
              button at the bottom of Safari.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
              2
            </span>
            <span className="text-sm text-card-foreground">
              Scroll down in the share sheet and tap{' '}
              <span className="font-medium">&ldquo;Add to Home Screen&rdquo;</span>.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
              3
            </span>
            <span className="text-sm text-card-foreground">
              Tap <span className="font-medium">&ldquo;Add&rdquo;</span> in the top-right corner.
            </span>
          </li>
        </ol>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default AddToHomeScreenModal;
