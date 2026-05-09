'use client';

import { clsx } from 'clsx';

interface StatusToggleProps {
  value: 'draft' | 'published';
  onChange: (value: 'draft' | 'published') => void;
  disabled?: boolean;
}

export function StatusToggle({ value, onChange, disabled = false }: StatusToggleProps) {
  const options: { label: string; value: 'draft' | 'published'; dotClass: string }[] = [
    { label: 'Draft', value: 'draft', dotClass: 'text-amber-500' },
    { label: 'Published', value: 'published', dotClass: 'text-green-500' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Article status"
      className={clsx(
        'inline-flex border border-neutral-300 rounded-md overflow-hidden',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <label
            key={option.value}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
              isActive ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50',
              !isActive && 'border-l border-neutral-300 first:border-l-0',
              disabled && 'cursor-not-allowed',
            )}
          >
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={isActive}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="sr-only"
            />
            <span className={clsx('text-base leading-none', option.dotClass)} aria-hidden="true">
              ●
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export default StatusToggle;
