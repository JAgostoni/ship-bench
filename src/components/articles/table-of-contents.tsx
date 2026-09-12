'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import type { TocHeading } from './toc-headings';

const WIDE_QUERY = '(min-width: 1280px)';

function subscribeToWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the viewport is at the TOC breakpoint.
 *
 * `useSyncExternalStore` rather than `useEffect` + `setState`: setting state
 * synchronously in an effect body causes a cascading render and is an ESLint error
 * in this repository. The server snapshot is `false`, which matches the CSS
 * default (the sticky column is `hidden` until `xl`).
 */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

/**
 * `On this page` (design-spec.md §3.4, UX17): rendered only when the body has ≥ 2
 * headings, and only at ≥ 1280px.
 *
 * **Two variants, never both visible.** `xl:block` on the sticky column and
 * `xl:hidden` on the inline `<details>` are applied here, so CSS alone decides —
 * but exactly one is ever visible, which is the contract a screen reader and the
 * accessibility audit observe.
 */

/** The ≥1280px sticky column. `IntersectionObserver` drives the active item. */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const ids = useMemo(() => headings.map((heading) => heading.id), [headings]);
  const wide = useIsWide();

  // The observer is only attached while the column can be seen. Below 1280px the
  // nav is `display: none`, so observing would track elements nobody is looking at
  // and would also fight the inline `<details>` for the same heading ids.
  useEffect(() => {
    if (!wide || ids.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.id);
        if (visible.length > 0) setActiveId(visible[0]);
      },
      { rootMargin: '-72px 0px -70% 0px', threshold: 0 },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [wide, ids]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="hidden xl:block">
      <p className="text-ink-subtle text-[11px] leading-[1.2] font-semibold tracking-[0.06em] uppercase">
        On this page
      </p>
      <ul className="mt-2 flex flex-col">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'relative flex min-h-8 items-center border-l-2 py-1 pr-2 text-[13px] no-underline',
                  heading.level === 3 ? 'pl-5' : 'pl-3',
                  active
                    ? 'border-accent text-accent-ink'
                    : 'text-ink-subtle hover:text-ink border-transparent',
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The `<1280px` fallback: an inline `<details>` block directly under the meta line,
 * collapsed by default (design-spec.md §3.5's "the detail TOC becomes the inline
 * `<details>`" row).
 *
 * No `IntersectionObserver` here: a `<details>` is collapsed until the reader opens
 * it, so an active-item highlight would have nothing to track, and the spec only
 * specifies scroll tracking for the sticky column.
 */
export function InlineTableOfContents({ headings }: { headings: TocHeading[] }) {
  if (headings.length < 2) return null;

  return (
    <details className="rounded-card border-border mb-6 border px-4 py-3 xl:hidden">
      <summary className="text-ink text-[13px] font-medium">On this page</summary>
      <ul className="mt-2 flex flex-col gap-1">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                'text-ink-muted hover:text-accent-ink block py-1 text-[13px] no-underline',
                heading.level === 3 ? 'pl-4' : '',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
