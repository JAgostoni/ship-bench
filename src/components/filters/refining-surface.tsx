'use client';

import { cn } from '@/lib/cn';
import { useNavigationTransition } from '@/components/layout/progress-bar';

export type RefiningSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * The "refining" state from design-spec.md §7.5: *"Filter / sort / page change →
 * Content at 60% opacity, 2px header progress bar. No skeleton — the content is
 * already known, just stale."*
 *
 * A skeleton here would be actively worse than dimming: the rows the user is looking
 * at are still correct except for the filter that is changing, and blanking them
 * makes a fast in-page refinement look like a page load. Dimming keeps the list
 * readable, signals that it is being replaced, and — because only `opacity`
 * changes — moves nothing, so there is no layout shift (§5.9).
 *
 * `aria-busy` is set on the region while pending, per §9.4. The two are the same
 * signal: `pending` comes from the shell-wide transition the filters and pager drive
 * through `useNavigationTransition`.
 */
export function RefiningSurface({ children, className }: RefiningSurfaceProps) {
  const { pending } = useNavigationTransition();

  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        'transition-opacity duration-(--duration-fast)',
        pending && 'opacity-60',
        className,
      )}
    >
      {children}
    </div>
  );
}
