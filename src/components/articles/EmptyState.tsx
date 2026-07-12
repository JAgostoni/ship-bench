import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary CTA — link to href with label, or custom node. */
  action?: {
    label: string;
    href: string;
  } | {
    node: ReactNode;
  };
};

/**
 * Empty / no-results panel — design-spec §6.10.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Icon
        className="mb-4 size-10 text-[var(--color-text-muted)]"
        strokeWidth={1.5}
        aria-hidden
      />
      <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
        {description}
      </p>
      {action ? (
        <div className="mt-6">
          {"node" in action ? (
            action.node
          ) : (
            <Link
              href={action.href}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-transparent bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              {action.label}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
