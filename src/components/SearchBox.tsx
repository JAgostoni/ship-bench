"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Snippet } from "@/components/Snippet";
import { Input } from "@/components/ui/Input";
import { SearchIcon, SpinnerIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import type { SearchResult } from "@/lib/repo/articles";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const DROPDOWN_LIMIT = 5;

/** The last applied response, keyed by the query it was for (stale guard + focus-reopen cache). */
type SearchData = {
  query: string;
  results: SearchResult[];
  total: number;
  error: boolean;
};

/**
 * Header search combobox (design §2.2A + §4.3, normative): 200 ms debounced
 * dropdown with top-5 results, full keyboard model (§7.3), and the global "/"
 * shortcut. DOM focus never leaves the input; the active option is visual +
 * `aria-activedescendant` only. Replaces the iteration-3 form stub.
 *
 * Navigation behavior (§2.2A) — close the dropdown and clear the input on any
 * route change, except on /search where the input pre-fills from ?q= — is
 * implemented by remounting the stateful inner component via `key`.
 */
export function SearchBox() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery =
    pathname === "/search" ? (searchParams.get("q") ?? "") : null;

  return (
    <SearchBoxInner
      key={`${pathname}?${urlQuery ?? ""}`}
      initialQuery={urlQuery ?? ""}
    />
  );
}

function SearchBoxInner({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Query of the request currently scheduled/in flight (drives the spinner).
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [data, setData] = useState<SearchData | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Request sequence number; bumping it drops every in-flight response.
  const seqRef = useRef(0);
  // The /search pre-fill alone must not fire a request on mount; only user
  // input does (§2.2A fires on typing).
  const interactedRef = useRef(false);

  const trimmedQuery = query.trim();
  // Below 2 chars the dropdown is closed and stays closed (§2.2A) — derived,
  // not stored. While a new query loads, previous results stay rendered.
  const dropdownOpen =
    open && data !== null && trimmedQuery.length >= MIN_QUERY_LENGTH;
  // A request for exactly the current input is outstanding and unanswered.
  const loading =
    pendingQuery === trimmedQuery &&
    data?.query !== trimmedQuery &&
    trimmedQuery.length >= MIN_QUERY_LENGTH;

  function closeDropdown() {
    seqRef.current++;
    setPendingQuery(null);
    setOpen(false);
    setActiveIndex(null);
  }

  // Debounced fetch with a stale-response guard.
  useEffect(() => {
    if (!interactedRef.current) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH || data?.query === trimmed) {
      // Nothing to request (too short, or this query's response — including
      // an error, which is never auto-retried — is already cached). Drop any
      // in-flight request for a superseded query.
      seqRef.current++;
      return;
    }
    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      setPendingQuery(trimmed);
      let next: SearchData;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=${DROPDOWN_LIMIT}`,
        );
        if (!res.ok) {
          throw new Error(`Search request failed with ${res.status}`);
        }
        const body = (await res.json()) as {
          results: SearchResult[];
          total: number;
        };
        next = {
          query: trimmed,
          results: body.results,
          total: body.total,
          error: false,
        };
      } catch {
        next = { query: trimmed, results: [], total: 0, error: true };
      }
      // Stale guard: drop responses that are superseded or no longer match
      // the current input value.
      if (
        seq !== seqRef.current ||
        inputRef.current?.value.trim() !== trimmed
      ) {
        return;
      }
      setPendingQuery(null);
      setData(next);
      setActiveIndex(null);
      // Don't pop the dropdown open if the user has already moved focus on.
      if (document.activeElement === inputRef.current) {
        setOpen(true);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, data]);

  // Outside click dismisses (design §2.2A).
  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  // Global "/" shortcut, suppressed while focus is in any editable (design §7.3).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const hasOptions = data !== null && !data.error && data.results.length > 0;
  // The "See all results" footer row is the last arrow-reachable option.
  const optionCount = hasOptions ? data.results.length + 1 : 0;
  const footerIndex = hasOptions ? data.results.length : null;

  function optionId(index: number) {
    return `${baseId}-option-${index}`;
  }

  function goToFullSearch() {
    closeDropdown();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function openOption(index: number) {
    if (data === null) {
      return;
    }
    if (index === footerIndex) {
      goToFullSearch();
      return;
    }
    const result = data.results[index];
    if (result === undefined) {
      return;
    }
    closeDropdown();
    // Route changes remount and clear, but navigating to the article the user
    // is already viewing changes no route — clear explicitly.
    setQuery("");
    router.push(`/articles/${result.id}`);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!dropdownOpen || optionCount === 0) {
          return;
        }
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((prev) =>
          prev === null
            ? delta === 1
              ? 0
              : optionCount - 1
            : (prev + delta + optionCount) % optionCount,
        );
        return;
      }
      case "Enter": {
        event.preventDefault();
        if (dropdownOpen && activeIndex !== null) {
          openOption(activeIndex);
        } else {
          goToFullSearch();
        }
        return;
      }
      case "Escape": {
        // First press closes the dropdown, second clears the input (§2.2A).
        // preventDefault also stops the native search-input clear-on-Esc.
        if (dropdownOpen) {
          event.preventDefault();
          closeDropdown();
        } else if (query !== "") {
          event.preventDefault();
          setQuery("");
        }
        return;
      }
      case "Tab": {
        closeDropdown();
        return;
      }
    }
  }

  function onInputFocus() {
    interactedRef.current = true;
    // Reopen on focus when results for the current query are cached (§4.3).
    if (
      trimmedQuery.length >= MIN_QUERY_LENGTH &&
      data !== null &&
      data.query === trimmedQuery
    ) {
      setOpen(true);
    }
  }

  return (
    <div ref={rootRef} role="search" className="relative w-full max-w-search">
      <Input
        ref={inputRef}
        id="header-search"
        label="Search articles"
        labelHidden
        type="search"
        autoComplete="off"
        placeholder="Search articles…"
        leadingIcon={<SearchIcon />}
        trailingSlot={
          loading ? (
            <span role="status" className="inline-flex text-text-muted">
              <SpinnerIcon />
              <span className="sr-only">Searching…</span>
            </span>
          ) : (
            // Hidden on pointer-coarse devices (design §3.3).
            <kbd
              aria-hidden="true"
              className="rounded-xs border border-border px-1 text-xs text-text-muted pointer-coarse:hidden"
            >
              /
            </kbd>
          )
        }
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          dropdownOpen && activeIndex !== null
            ? optionId(activeIndex)
            : undefined
        }
        value={query}
        onChange={(event) => {
          interactedRef.current = true;
          const value = event.target.value;
          setQuery(value);
          // A non-cached query opens the dropdown when its response arrives;
          // a cached one gets no response, so reopen here (e.g. Esc + retype).
          const trimmed = value.trim();
          if (trimmed.length >= MIN_QUERY_LENGTH && data?.query === trimmed) {
            setOpen(true);
          }
        }}
        onKeyDown={onInputKeyDown}
        onFocus={onInputFocus}
      />
      {dropdownOpen && data !== null && (
        <div className="pop-in absolute left-0 top-full z-20 mt-2 w-full min-w-80 overflow-hidden rounded-md border border-border bg-surface shadow-md max-md:fixed max-md:inset-x-4 max-md:top-14 max-md:w-auto max-md:min-w-0">
          <ul role="listbox" id={listboxId} aria-label="Search results">
            {hasOptions && (
              <>
                {data.results.map((result, index) => (
                  <li
                    key={result.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={cx(
                      "flex min-h-11 cursor-pointer flex-col justify-center border-l-2 px-3 py-2 lg:min-h-10",
                      activeIndex === index
                        ? "border-accent bg-bg"
                        : "border-transparent",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => openOption(index)}
                  >
                    <span className="truncate text-base font-medium">
                      {result.title}
                    </span>
                    <span className="truncate text-sm text-text-secondary">
                      <Snippet text={result.snippet} />
                    </span>
                  </li>
                ))}
                <li
                  id={optionId(data.results.length)}
                  role="option"
                  aria-selected={activeIndex === footerIndex}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center border-l-2 border-t border-t-border px-3 py-2 text-base font-medium text-accent lg:min-h-10",
                    activeIndex === footerIndex
                      ? "border-l-accent bg-bg"
                      : "border-l-transparent",
                  )}
                  onMouseEnter={() => setActiveIndex(data.results.length)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => goToFullSearch()}
                >
                  See all {data.total} results →
                </li>
              </>
            )}
          </ul>
          {data.error ? (
            <p className="px-3 py-2 text-sm text-danger-text">
              Search isn’t responding — press Enter to open full search
            </p>
          ) : data.results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">
              No matches for “{data.query}” — press Enter to search everything
            </p>
          ) : null}
        </div>
      )}
      {/* Count announcements go through this live node, never the listbox (§7.4). */}
      <span aria-live="polite" className="sr-only">
        {data !== null && !data.error
          ? data.results.length === 0
            ? `No matches for ${data.query}`
            : `${data.total} result${data.total === 1 ? "" : "s"} for ${data.query}`
          : null}
      </span>
    </div>
  );
}
