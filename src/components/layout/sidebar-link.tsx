'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * One sidebar row, with its active state derived from the current path.
 *
 * This is a Client Component on purpose: the shell is a layout and layouts do
 * not receive the pathname, so `usePathname()` is the only way for a shared
 * sidebar to mark the current route without every page passing a prop down.
 *
 * The count renders as `<span class="sr-only">{n} articles</span>` followed by an
 * `aria-hidden` numeral, so a screen reader hears "Engineering, 12 articles"
 * rather than "Engineering 12" (design-spec.md §9.3).
 */
export function SidebarLink({
  href,
  count,
  children,
}: {
  href: string;
  count?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-control flex h-8 items-center justify-between gap-2 px-2 text-[14px] no-underline',
        active
          ? 'bg-accent-soft text-accent-ink font-medium'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      <span className="truncate">{children}</span>
      {count === undefined ? null : (
        <span className="text-ink-subtle shrink-0 text-[12px] tabular-nums">
          <span className="sr-only">{count} articles</span>
          <span aria-hidden="true">{count}</span>
        </span>
      )}
    </Link>
  );
}
