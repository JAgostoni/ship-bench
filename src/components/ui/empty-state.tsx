import { cn } from '@/lib/cn';

export type EmptyStateProps = {
  /** Already rendered, e.g. `<FileText className="h-8 w-8" aria-hidden="true" />`. */
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

/**
 * design-spec.md §5.6. Centered column, `max-w-sm`, `py-16`, no illustration and
 * no gradient. Every list surface renders one of these rather than a blank area
 * (design-spec.md §7.3: "no list surface may render blank").
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('mx-auto flex max-w-sm flex-col items-center py-16 text-center', className)}>
      <div className="text-ink-subtle" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-ink mt-4 text-[18px] leading-snug font-semibold">{title}</h2>
      <p className="text-ink-muted mt-2 text-[14px] leading-normal">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
