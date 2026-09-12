'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * The 2px accent bar directly under the header (design-spec.md §2.1).
 *
 * It is the **only** global loading indicator for filter, sort, and pagination
 * changes, and it is `role="presentation"` because `useTransition`'s pending
 * state has no meaningful announcement (the content itself stays visible and the
 * result count is the live region).
 *
 * Iteration 4 renders it for the header's own navigation. Iteration 5 drives it
 * from `FilterBar`/`Pagination` as the spec's diagram shows.
 */
export function ProgressBar({ active = false }: { active?: boolean }) {
  const [pending] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  void router;
  void pathname;

  if (!active && !pending) return null;

  return (
    <div role="presentation" aria-hidden="true" className="h-0.5 w-full overflow-hidden">
      <div className="bg-accent h-full w-1/3 animate-[kb-progress_1s_linear_infinite]" />
    </div>
  );
}
