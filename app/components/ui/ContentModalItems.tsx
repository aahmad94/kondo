// ContentModalItems.tsx
// Reusable content components for ContentModal (e.g., tips lists, help, etc.)

import React from 'react';
import { ChevronDownIcon, PauseCircleIcon } from '@heroicons/react/24/solid';

export function DojoTipsList() {
  return (
    <ol style={{ paddingLeft: '1.5em', color: '#b59f3b' }} className="list-decimal space-y-2">
      <li><strong>Use flashcard mode</strong>: test yourself after reviewing the daily material in dojo</li>
      <li><strong>
        Hide romanization{' '}
        (
          <ChevronDownIcon 
            className="h-5 w-5 inline text-white" 
            style={{ verticalAlign: 'middle' }} 
          />
        )
        </strong>
        {' '}challenge yourself by removing pronunciation aids</li>
      <li>
        <strong>
            Pause strategically{' '}(
            <PauseCircleIcon 
                className="inline h-5 w-5 text-yellow-400 align-text-bottom"
                style={{ verticalAlign: 'middle' }} 
            />
            )
        </strong>
        {' '}remove mastered content to focus on challenging material
      </li>
    </ol>
  );
} 