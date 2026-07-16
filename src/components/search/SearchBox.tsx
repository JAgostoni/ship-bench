"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";

type SearchHit = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  category: { name: string; slug: string } | null;
};

type SearchApiResponse = {
  query: string;
  results: SearchHit[];
  error?: string;
};

const DEBOUNCE_MS = 250;
const TYPEAHEAD_LIMIT = 8;

/**
 * Header typeahead search — design §3.2 / §6.3.
 * Debounced fetch to GET /api/search; keyboard combobox pattern.
 */
export function SearchBox() {
  const router = useRouter();
  const listboxId = useId();
  /** Stable id for empty-state “Focus search” deep-link from /search */
  const inputId = "header-search";
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const goToSearchPage = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      close();
      if (!trimmed) {
        router.push("/search");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [close, router],
  );

  const clearSearchResults = useCallback(() => {
    abortRef.current?.abort();
    setResults([]);
    setError(null);
    setLoading(false);
    setHasSearched(false);
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Debounced fetch — only schedule when query is non-empty; clear on input change
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      abortRef.current?.abort();
      return;
    }

    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=${TYPEAHEAD_LIMIT}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setError("Search failed. Try again.");
          setResults([]);
          setHasSearched(true);
          setOpen(true);
          setActiveIndex(-1);
          return;
        }
        const data = (await res.json()) as SearchApiResponse;
        setResults(data.results ?? []);
        setHasSearched(true);
        setOpen(true);
        setActiveIndex(-1);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Search failed. Try again.");
        setResults([]);
        setHasSearched(true);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [value]);

  // Click outside closes dropdown
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close]);

  const showDropdown =
    open &&
    value.trim().length >= 1 &&
    (loading || hasSearched || Boolean(error));

  const activeOptionId =
    activeIndex >= 0 && results[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown || results.length === 0) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => (i + 1) % results.length);
      setOpen(true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!showDropdown || results.length === 0) return;
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        close();
        router.push(`/articles/${results[activeIndex].slug}`);
        return;
      }
      goToSearchPage(value);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      close();
      router.push(`/articles/${results[activeIndex].slug}`);
      return;
    }
    goToSearchPage(value);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md md:mx-auto">
      <form role="search" onSubmit={onSubmit} className="relative">
        <label className="sr-only" htmlFor={inputId}>
          Search articles
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            if (next.trim().length < 1) {
              clearSearchResults();
            }
          }}
          onFocus={() => {
            if (value.trim().length >= 1 && (hasSearched || loading || error)) {
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder="Search articles…"
          autoComplete="off"
          aria-label="Search articles"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
          aria-activedescendant={activeOptionId}
          aria-busy={loading}
          role="combobox"
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-2 pl-9 pr-10 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]"
            aria-hidden
          />
        ) : null}
      </form>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)] max-md:max-h-[50vh]"
        >
          {error ? (
            <div
              role="status"
              className="px-3 py-2.5 text-sm text-[var(--color-danger)]"
            >
              {error}
            </div>
          ) : loading && results.length === 0 ? (
            <div
              role="status"
              className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]"
            >
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div
              role="status"
              className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]"
            >
              No published articles match
            </div>
          ) : (
            <>
              <ul className="py-1">
                {results.map((hit, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <li key={hit.id} role="presentation">
                      <Link
                        id={`${listboxId}-option-${index}`}
                        role="option"
                        aria-selected={isActive}
                        href={`/articles/${hit.slug}`}
                        onClick={close}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`block px-3 py-2 transition-colors ${
                          isActive
                            ? "bg-[var(--color-accent-muted)]"
                            : "hover:bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
                            {hit.title}
                          </span>
                          {hit.category ? (
                            <span className="shrink-0 rounded-[var(--radius-full)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                              {hit.category.name}
                            </span>
                          ) : null}
                        </div>
                        {hit.excerpt ? (
                          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                            {hit.excerpt}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => goToSearchPage(value)}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus-ring)]"
                >
                  View all results for “{value.trim()}”
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
