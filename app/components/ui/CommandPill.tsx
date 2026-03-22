'use client';

import React, { useRef, useEffect } from 'react';

export interface CommandPillOption {
  value: string;
  label: string;
}

export interface CommandPillProps {
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  // Dropdown support — if `options` is provided the pill renders as a select
  options?: CommandPillOption[];
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const CommandPill: React.FC<CommandPillProps> = ({
  label,
  isActive,
  isDisabled,
  onClick,
  icon,
  className = '',
  options,
  selectedValue,
  onValueChange,
  isOpen,
  onToggle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDropdown = Array.isArray(options) && options.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdown || !isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle?.();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdown, isOpen, onToggle]);

  const pillClasses = [
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
    'transition-all duration-150 select-none whitespace-nowrap flex-shrink-0',
    isDisabled
      ? 'opacity-25 cursor-not-allowed'
      : 'cursor-pointer',
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm'
      : isDisabled
        ? 'bg-muted text-muted-foreground border border-border'
        : 'bg-card text-card-foreground border border-border hover:bg-accent hover:text-accent-foreground',
    className,
  ].join(' ');

  if (isDropdown) {
    const displayValue = selectedValue ?? (options?.[0]?.value || '');
    const displayLabel = options?.find(o => o.value === displayValue)?.label ?? displayValue;

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          disabled={isDisabled}
          onClick={isDisabled ? undefined : onToggle}
          className={pillClasses}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
          <span>
            {label}
            {displayValue !== 'medium' || isActive ? (
              <span className="ml-1 opacity-70">{displayLabel}</span>
            ) : null}
          </span>
          {/* Chevron */}
          <svg
            className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && !isDisabled && (
          <div
            role="listbox"
            className="absolute bottom-full mb-1.5 left-0 bg-card border border-border rounded-xl shadow-lg py-1 z-50 min-w-[100px] overflow-hidden"
          >
            {options!.map((option) => (
              <button
                key={option.value}
                role="option"
                type="button"
                aria-selected={displayValue === option.value}
                onClick={() => {
                  onValueChange?.(option.value);
                  onToggle?.();
                }}
                className={[
                  'w-full text-left px-3 py-1.5 text-sm transition-colors',
                  displayValue === option.value
                    ? 'text-primary font-semibold bg-accent/50'
                    : 'text-card-foreground hover:bg-accent hover:text-accent-foreground',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={pillClasses}
    >
      {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default CommandPill;
