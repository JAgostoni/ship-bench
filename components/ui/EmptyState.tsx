import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-[var(--color-text-muted)]">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
