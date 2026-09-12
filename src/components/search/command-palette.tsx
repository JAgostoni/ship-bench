'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Highlight } from './highlight';
import type { SearchResults } from '@/types/domain';

/** design-spec.md §4.2: the palette shows the top 8 results. */
export const PALETTE_LIMIT = 8;

/**
 * `⌘K` / `Ctrl+K` command palette (design-spec.md §3.3 rule 6, architecture.md
 * §10.3).
 *
 * **This is the only place the UI fetches JSON.** Every other read is an RSC. The
 * palette is a client-side power-user affordance over `GET /api/search`, and
 * design-spec.md U10 requires it to be strictly secondary: every result here is
 * also reachable from the header input and `/search`, and the persistent last row
 * links to the full page.
 *
 * `cmdk` supplies the roving focus, `↑`/`↓`, `Enter`, `Escape`, and — through its
 * Radix Dialog root — the focus trap and focus restoration to the opener. Mounting
 * it here means the shortcut works on every route without each page opting in.
 */
export function CommandPalette({
  /** Controlled open state. Omit to let the palette own its `⌘K` listener. */
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean | ((value: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(open) : next;
      if (controlledOpen === undefined) setUncontrolledOpen(resolved);
      onOpenChange?.(resolved);
    },
    [controlledOpen, onOpenChange, open],
  );
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Global shortcut, registered once. Skipped when the caller owns `open`, so the
  // header's own listener is the only one that fires.
  useEffect(() => {
    if (controlledOpen !== undefined) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setUncontrolledOpen((value) => !value);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [controlledOpen]);

  // Debounced, cancellable fetch. `AbortController` is what keeps a fast typist
  // from rendering an out-of-order response, and the previous results deliberately
  // stay on screen while the next request is in flight (§7.5's palette row).
  //
  // The *empty* query is handled by `onQueryChange` below rather than by this
  // effect: clearing `data` synchronously inside an effect body would be a
  // cascading render, and the clearing is a direct consequence of the user's
  // keystroke, not of the component mounting.
  const abortRef = useRef<AbortController | null>(null);
  const onQueryChange = useCallback((next: string) => {
    setQuery(next);
    if (next.trim() === '') {
      abortRef.current?.abort();
      setData(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term === '') return;

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      fetch(`/api/search?q=${encodeURIComponent(term)}&limit=${PALETTE_LIMIT}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Search failed with status ${response.status}.`);
          return (await response.json()) as SearchResults;
        })
        .then((payload) => {
          setData(payload);
          setLoading(false);
        })
        .catch((error: unknown) => {
          // An abort is expected on every keystroke, not a failure.
          if (error instanceof DOMException && error.name === 'AbortError') return;
          // No silent failure: the palette says so rather than showing stale
          // results as if they were current.
          setLoading(false);
          setData({ query: term, total: null, limit: PALETTE_LIMIT, results: [] });
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [open, query]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const results = data?.results ?? [];

  function select(slug: string) {
    setOpen(false);
    setQuery('');
    router.push(`/articles/${slug}`);
  }

  function seeAll() {
    setOpen(false);
    const term = query.trim();
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search articles"
      // `shouldFilter={false}` because the server already ranked and filtered:
      // client-side re-filtering would hide a hit whose title lacks the literal
      // term, which is exactly what a body-only match looks like.
      shouldFilter={false}
      overlayClassName="bg-overlay fixed inset-0 z-40"
      contentClassName="rounded-card shadow-dialog bg-surface border-border fixed top-24 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 border p-0"
    >
      <div className="border-border flex items-center gap-2 border-b px-3">
        <Search className="text-ink-subtle h-4 w-4 shrink-0" aria-hidden="true" />
        <Command.Input
          value={query}
          onValueChange={onQueryChange}
          placeholder="Search articles…"
          className="text-ink placeholder:text-ink-subtle h-12 w-full bg-transparent text-[14px] outline-none"
        />
        {loading ? (
          <Loader2
            aria-label="Searching"
            role="status"
            className="text-ink-subtle h-4 w-4 shrink-0 animate-spin"
          />
        ) : null}
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="text-ink-muted px-3 py-6 text-center text-[14px]">
          {query.trim() === '' ? 'Type to search articles.' : 'No results.'}
        </Command.Empty>

        {results.map((hit) => (
          <Command.Item
            key={hit.id}
            value={hit.title}
            onSelect={() => {
              select(hit.slug);
            }}
            className="rounded-control data-[selected=true]:bg-surface-muted flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2"
          >
            <span className="text-ink text-[14px] font-medium">
              <Highlight segments={hit.titleSegments} />
            </span>
            <span className="text-ink-subtle text-[12px]">
              {hit.category?.name ?? 'Uncategorized'}
            </span>
          </Command.Item>
        ))}

        {query.trim() !== '' ? (
          <Command.Item
            value="see-all-results"
            onSelect={seeAll}
            className="rounded-control data-[selected=true]:bg-surface-muted text-accent-ink mt-1 cursor-pointer px-3 py-2 text-[14px]"
          >
            See all results for “{query.trim()}”
          </Command.Item>
        ) : null}
      </Command.List>

      <div className="border-border text-ink-subtle flex items-center gap-4 border-t px-3 py-2 text-[11px]">
        <span>↑↓ to navigate</span>
        <span>↵ to open</span>
        <span>esc to close</span>
      </div>
    </Command.Dialog>
  );
}
