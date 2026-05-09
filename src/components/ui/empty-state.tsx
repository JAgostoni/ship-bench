import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import Button from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-neutral-300 mb-4" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="text-sm text-neutral-500 mt-2 max-w-md">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="primary" size="md">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
