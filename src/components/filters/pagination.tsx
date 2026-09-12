'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNavigationTransition } from '@/components/layout/progress-bar';

/** design-spec.md §4.1: numbered links cap at ±3 around the current page. */
export const PAGINATION_WINDOW = 3;

export type PaginationProps = {
  page: number;
  /**
   * The last page, or `null` when the server did not compute a total.
   *
   * `architecture.md` §9.1 computes `total` only for `page > 1`, so page 1 of a
   * large set genuinely does not know its last page. §4.1 is explicit that the pager
   * must not invent one: it renders `Page 1` + `Next →` instead of `Page 1 of 3`.
   */
  totalPages: number | null;
  /** Whether a further page exists, which is what makes `Next` live when `totalPages` is null. */
  hasNext: boolean;
  /** Route the pager writes to, without a query string. */
  basePath: string;
  className?: string;
};

/**
 * design-spec.md §5.9 and §9.3 — `nav[aria-label="Pagination"]` wrapping an ordered
 * list, 36×36px controls, `aria-current="page"` on the current one.
 *
 * **Disabled `Previous`/`Next` are real `<span>`s with `aria-disabled="true"`, not
 * links** (§5.9). A disabled anchor is still focusable and still announces as a
 * link, which sends a keyboard user to a control that does nothing; a `<span>` is
 * skipped in the tab order and reads as plain text. The label keeps the arrow
 * glyph `aria-hidden` so the accessible name is "Previous"/"Next".
 */
export function Pagination({ page, totalPages, hasNext, basePath, className }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { run } = useNavigationTransition();

  const pages = pageWindow(page, totalPages);
  const canGoBack = page > 1;
  const canGoForward = totalPages === null ? hasNext : page < totalPages;

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete('page');
    else params.set('page', String(target));
    const query = params.toString();
    run(() => {
      // A page change IS a navigation, so the viewport returns to the top — unlike
      // a filter refinement, which uses `scroll: false` (§4.1's back-button rule).
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  // A single page with nothing beyond it has no pager to render at all.
  if (totalPages === 1 || (totalPages === null && page === 1 && !hasNext)) return null;

  const label = totalPages === null ? `Page ${page}` : `Page ${page} of ${totalPages}`;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      <ol className="flex items-center gap-1">
        <li>
          {canGoBack ? (
            <PagerButton onClick={() => goTo(page - 1)} label="Previous page">
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Previous</span>
              <span className="md:hidden">Prev</span>
            </PagerButton>
          ) : (
            <DisabledControl>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Previous</span>
              <span className="md:hidden">Prev</span>
            </DisabledControl>
          )}
        </li>

        <li className="px-2">
          <p aria-live="polite" className="text-ink-muted text-[13px] whitespace-nowrap">
            {label}
          </p>
        </li>

        {/*
          Numbers collapse below 768px (`← Prev` / `2 / 3` / `Next →`), which is
          why the whole list is `hidden md:flex` rather than each item.
        */}
        {pages.length > 0 ? (
          <li className="hidden md:block">
            <ol className="flex items-center gap-1" aria-label="Page numbers">
              {pages.map((entry) =>
                entry === page ? (
                  <li key={entry}>
                    <span
                      aria-current="page"
                      className="rounded-control bg-accent-soft text-accent-ink flex h-9 w-9 items-center justify-center text-[13px] font-medium tabular-nums"
                    >
                      {entry}
                    </span>
                  </li>
                ) : (
                  <li key={entry}>
                    <PagerButton
                      onClick={() => goTo(entry)}
                      label={`Page ${entry}`}
                      className="w-9 tabular-nums"
                    >
                      <span aria-hidden="true">{entry}</span>
                    </PagerButton>
                  </li>
                ),
              )}
            </ol>
          </li>
        ) : null}

        <li>
          {canGoForward ? (
            <PagerButton onClick={() => goTo(page + 1)} label="Next page">
              <span className="hidden md:inline">Next</span>
              <span className="md:hidden">Next</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </PagerButton>
          ) : (
            <DisabledControl>
              <span>Next</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </DisabledControl>
          )}
        </li>
      </ol>
    </nav>
  );
}

/**
 * The numbers to render, or `[]` when the total is unknown.
 *
 * With a known `totalPages` the window is ±3 around the current page (§4.1). With
 * `totalPages === null` only the current page is honest, and rendering it as a
 * single numbered link would be noise next to the `Page 1` label — so the list is
 * empty and the label plus `Next →` carry the state.
 */
function pageWindow(page: number, totalPages: number | null): number[] {
  if (totalPages === null || totalPages <= 1) return [];
  const start = Math.max(1, page - PAGINATION_WINDOW);
  const end = Math.min(totalPages, page + PAGINATION_WINDOW);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function PagerButton({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'kb-touch rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink relative flex h-9 items-center justify-center gap-1 px-2.5 text-[13px]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A real `<span>` so it is skipped in the tab order, per design-spec.md §5.9.
 * `aria-disabled` still announces the state, and `--disabled-ink` gives it the
 * visual treatment from §7.1.
 */
function DisabledControl({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled="true"
      className="text-disabled-ink flex h-9 items-center justify-center gap-1 px-2.5 text-[13px]"
    >
      {children}
    </span>
  );
}
