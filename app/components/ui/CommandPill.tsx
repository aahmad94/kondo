'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDropdown = Array.isArray(options) && options.length > 0;

  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      // Anchor above the trigger; we'll use bottom offset from viewport
      top: rect.top - 4,
      transform: 'translateY(-100%)',
      minWidth: rect.width,
      zIndex: 9999,
    });
  }, []);

  // Recalculate position whenever the menu opens or the container scrolls/resizes
  useEffect(() => {
    if (!isDropdown || !isOpen) return;
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isDropdown, isOpen, updateMenuPosition]);

  // Close when clicking outside both the trigger and the portal menu
  useEffect(() => {
    if (!isDropdown || !isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) onToggle?.();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdown, isOpen, onToggle]);

  const pillClasses = [
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
    'transition-all duration-150 select-none whitespace-nowrap flex-shrink-0',
    isDisabled ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer',
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

    const dropdownMenu = isOpen && !isDisabled ? (
      <div
        ref={menuRef}
        role="listbox"
        style={menuStyle}
        className="bg-card border border-border rounded-xl shadow-lg py-1 min-w-[100px] overflow-hidden"
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
    ) : null;

    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          disabled={isDisabled}
          onClick={isDisabled ? undefined : onToggle}
          className={pillClasses}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
          <span>
            {displayLabel}
          </span>
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

        {typeof window !== 'undefined' && dropdownMenu
          ? createPortal(dropdownMenu, document.body)
          : null}
      </>
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
