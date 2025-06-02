import React from 'react';

interface StandardResponseProps {
  items: string[];
}

export default function StandardResponse({ items }: StandardResponseProps) {
  // Extract the content from each numbered item (removing the "1/", "2/", etc.)
  const processedItems = items.map(item => {
    const match = item.match(/^\s*\d+\/\s*(.*)$/);
    return match ? match[1].trim() : item.trim();
  });

  return (
    <div className="pr-3" style={{ color: '#b59f3b' }}>
      <div className="space-y-2">
        {/* First line - larger text */}
        <div className="text-lg font-medium">
          {processedItems[0]}
        </div>

        {/* Second line - subtle or blue depending on number of items */}
        {processedItems.length === 2 ? (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[1]}
          </span>
        ) : processedItems.length === 3 ? (
          <div className="text-sm opacity-80">
            {processedItems[1]}
          </div>
        ) : processedItems.length === 4 ? (
          <div className="text-sm opacity-80">
            {processedItems[1]}
          </div>
        ) : null}

        {/* Third line - italic (for 4 items), or blue (for 3 items) */}
        {processedItems.length === 3 ? (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[2]}
          </span>
        ) : processedItems.length === 4 ? (
          <div className="text-sm opacity-60 italic">
            {processedItems[2]}
          </div>
        ) : null}

        {/* Fourth line - blue (for 4 items) */}
        {processedItems.length === 4 && (
          <span className="inline-block text-sm text-blue-400 bg-blue-900/20 p-2 rounded">
            {processedItems[3]}
          </span>
        )}
      </div>
    </div>
  );
} 