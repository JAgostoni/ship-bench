'use client';

import { Command, Search, X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useDebouncedSearchNavigation } from './use-debounced-search-navigation';

export type SearchInputProps = {
  /** Seed for the field, from the URL's `q`. Never used as a `defaultValue`. */
  initialQuery?: string;
  /** Opens the ⌘K palette. Passed down so the hint and the handler cannot drift. */
  onOpenPalette?: () => void;
  /** `autoFocus` for the <768px expanded row (design-spec.md §6.5). */
  autoFocus?: boolean;
  /** `Escapes`/blur collapse hook for the mobile overlay. */
  onCollapse?: () => void;
  className?: string;
};

/**
 * design-spec.md §5.4 — the one search field, reused by the header (all routes)
 * and the <768px expanded overlay.
 *
 * Every attribute below is load-bearing, and three are easy to get wrong:
 *
 * - **`role="search"` sits on the `<form>`**, not the input, so screen readers
 *   announce a search landmark (§9.3).
 * - **`aria-label="Search articles"` is the label**; the placeholder is separate
 *   copy and is never the accessible name (§9.3).
 * - **The value is controlled from local state**, never a `defaultValue`, or
 *   back-navigation desyncs the field from the URL (§5.4).
 *
 * Submitting the form is prevented: navigation is owned by the debounce, and a
 * native GET submit would push a history entry on every `Enter`.
 */
export function SearchInput({
  initialQuery = '',
  onOpenPalette,
  autoFocus = false,
  onCollapse,
  className,
}: SearchInputProps) {
  const { value, change, clear, inputRef } = useDebouncedSearchNavigation(initialQuery);

  // The mobile overlay is a separate mount, so it has to move focus on its own.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, inputRef]);

  return (
    <form
      role="search"
      action="/search"
      onSubmit={(event) => event.preventDefault()}
      className={cn('flex min-w-0 flex-1 items-center', className)}
    >
      <div className="rounded-control bg-surface-muted border-border focus-within:border-border-strong flex h-9 w-full items-center gap-2 border px-3">
        <Search className="text-ink-subtle h-4 w-4 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          id={autoFocus ? 'header-search-mobile' : 'header-search'}
          name="q"
          type="search"
          role="searchbox"
          aria-label="Search articles"
          placeholder="Search articles…"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          value={value}
          onChange={(event) => change(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              // Clear first; only when already empty does the field give up focus
              // (design-spec.md §9.2).
              if (value !== '') clear();
              else inputRef.current?.blur();
              if (onCollapse) onCollapse();
              return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
              event.preventDefault();
              onOpenPalette?.();
            }
          }}
          className="text-ink placeholder:text-ink-subtle h-full w-full min-w-0 bg-transparent text-[14px] outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />

        {value !== '' ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="rounded-control text-ink-subtle hover:text-ink relative flex h-6 w-6 shrink-0 items-center justify-center"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        {/*
          The `⌘K` hint is a real button rather than decoration: the palette must be
          reachable on a touch viewport, where there is no keyboard shortcut
          (design-spec.md §6.5's "no hover-only affordances"). It is hidden below
          1024px per §5.4 and §6.2, where the search icon replaces the whole field.
        */}
        <button
          type="button"
          aria-label="Open command palette"
          onClick={() => onOpenPalette?.()}
          className="rounded-control bg-surface-sunken text-ink-subtle hidden h-5 shrink-0 items-center gap-0.5 px-1.5 text-[11px] xl:flex"
        >
          <Command className="h-3 w-3" aria-hidden="true" />K
        </button>
      </div>
    </form>
  );
}
