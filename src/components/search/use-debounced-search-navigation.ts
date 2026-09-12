'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigationTransition } from '@/components/layout/progress-bar';

/** design-spec.md §4.2: 250 ms balances request volume against perceived instantness. */
export const SEARCH_DEBOUNCE_MS = 250;

/** True inside a text-entry control, where `/` is a literal character rather than a shortcut. */
function isTextEntry(element: Element | null): boolean {
  if (element === null) return false;
  const tag = element.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return element instanceof HTMLElement && element.isContentEditable;
}

/**
 * Debounced, URL-driven search navigation shared by the header's `SearchInput`.
 *
 * **Why the field is locally controlled.** The value the user sees is React state;
 * `router.replace('/search?q=…')` only runs once the debounce elapses. A slow
 * render therefore never blocks typing (design-spec.md §3.3's 0 ms "instant
 * character echo"), and a controlled `value` — rather than a `defaultValue` — is
 * what keeps back-navigation from desyncing the field (design-spec.md §5.4).
 *
 * The URL is reconciled back into the field in one direction: when the URL changes
 * for a reason other than this hook's own navigation (back/forward, a sidebar
 * link), the field re-seeds.
 */
export function useDebouncedSearchNavigation(initialQuery = '') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { run } = useNavigationTransition();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The field seeds from the URL's `q` so the header is correct on `/search` even
  // though the shell layout does not receive `searchParams` (layouts do not — only
  // pages do). It is a plain `useState` initial value rather than a `defaultValue`,
  // and `initialQuery` remains a test-only override.
  const [value, setValue] = useState(() => searchParams.get('q') ?? initialQuery);
  const urlQuery = searchParams.get('q') ?? '';

  // The last value this hook itself pushed, so the URL-sync effect can tell "the
  // URL changed because I navigated" from "the URL changed underneath me".
  const pushedValue = useRef(value);

  // Re-seed only when no debounce is pending and the change was not ours.
  useEffect(() => {
    if (timer.current !== null) return;
    if (urlQuery === pushedValue.current) return;
    pushedValue.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery]);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const commit = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed === '') params.delete('q');
      else params.set('q', trimmed);
      // A new term is a new result set; page 3 of the old one is meaningless.
      params.delete('page');
      params.delete('category');

      pushedValue.current = trimmed;
      const query = params.toString();
      run(() => {
        router.replace(`/search${query ? `?${query}` : ''}`, { scroll: false });
      });
    },
    [router, run, searchParams],
  );

  /** Character echo is immediate; the navigation waits for the debounce. */
  const change = useCallback(
    (next: string) => {
      setValue(next);
      cancelTimer();
      timer.current = setTimeout(() => {
        timer.current = null;
        commit(next);
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelTimer, commit],
  );

  /** `X` and `Escape`: clear and navigate at once, with no debounce. */
  const clear = useCallback(() => {
    cancelTimer();
    setValue('');
    commit('');
  }, [cancelTimer, commit]);

  useEffect(() => cancelTimer, [cancelTimer]);

  // `/` focuses the field from anywhere except a text-entry control
  // (design-spec.md §9.2). No global `Escape` listener: `Escape` is handled on the
  // field itself so it cannot hijack a dialog or the palette.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextEntry(document.activeElement)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    value,
    change,
    clear,
    inputRef,
    onSearchPage: pathname === '/search',
  };
}
