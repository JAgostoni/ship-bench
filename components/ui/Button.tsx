import type { ComponentPropsWithoutRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-accent-subtle)] disabled:bg-[var(--color-border-strong)]',
  secondary: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus:ring-[var(--color-accent-subtle)] disabled:text-[var(--color-text-muted)]',
  tertiary: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] focus:ring-[var(--color-accent-subtle)] disabled:text-[var(--color-text-muted)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        loading && 'relative text-transparent',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      )}
      {children}
    </button>
  );
}
