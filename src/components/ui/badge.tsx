import { type ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'neutral' | 'warning' | 'success';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  success: 'bg-green-100 text-green-700 border-green-200',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
