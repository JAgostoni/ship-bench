'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Moves focus to the new page's `h1` on **client-side navigation** only
 * (design-spec.md §9.2).
 *
 * The distinction the spec draws is the whole reason this is more than a
 * `useEffect` on `pathname`:
 *
 * - Navigating to a different page leaves a screen-reader user stranded at the top
 *   of the document unless focus is moved, so it must move.
 * - **Refining** — a filter chip, a status select, a sort change, a page change —
 *   is not navigation. Moving focus there would yank the user out of the toolbar
 *   they are still using, so it must not.
 *
 * The two are told apart by what changed: a `pathname` change is navigation, a
 * `searchParams`-only change is refinement. The first render is skipped so a direct
 * load (where the browser has already focused the document) does not steal focus
 * either.
 */
export function FocusOnNavigate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPath = useRef(pathname);
  const mounted = useRef(false);

  useEffect(() => {
    // Skip the initial mount: a hard load is not a client-side navigation.
    if (!mounted.current) {
      mounted.current = true;
      previousPath.current = pathname;
      return;
    }

    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    const main = document.getElementById('main');
    const heading = main?.querySelector<HTMLElement>('h1');
    // `h1` carries `tabIndex={-1}` on routed pages; the shell's `main` is the
    // fallback so an unexpected page shape still lands somewhere sensible.
    (heading ?? main)?.focus({ preventScroll: false });
  }, [pathname, searchParams]);

  return null;
}
