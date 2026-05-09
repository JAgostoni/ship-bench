'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  variant?: 'header' | 'page';
}

export default function SearchBar({ variant = 'header' }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive query from URL search params instead of setting in effect
  const queryFromUrl = searchParams.get('q') ?? '';

  // Use internal state for typing, sync from URL-derived value as initial
  const [query, setQuery] = useState(queryFromUrl);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(queryFromUrl);
  const [isExpanded, setIsExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query when URL changes externally (e.g., browser back/forward)
  if (queryFromUrl !== previousUrlQuery) {
    setPreviousUrlQuery(queryFromUrl);
    setQuery(queryFromUrl);
  }

  // Derive isSearching from whether query matches URL
  const isSearching = useMemo(() => {
    const trimmed = query.trim();
    return trimmed.length > 0 && trimmed !== queryFromUrl;
  }, [query, queryFromUrl]);

  const navigateToSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (trimmed) {
        router.push(`/?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push('/');
      }
    },
    [router]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigateToSearch(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      navigateToSearch(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      if (isExpanded) setIsExpanded(false);
      navigateToSearch('');
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsExpanded(false);
    navigateToSearch('');
    inputRef.current?.focus();
  };

  // Auto-focus when expanded on mobile
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const isHeader = variant === 'header';
  const hasQuery = query.length > 0;

  const inputContent = (
    <div
      className={
        isHeader
          ? `relative ${isExpanded ? 'fixed inset-x-0 top-0 z-[var(--z-modal)] bg-white px-4 py-3 shadow-md md:static md:shadow-none md:px-0 md:py-0 md:w-full max-w-xs md:max-w-none' : ''}`
          : 'relative w-full'
      }
    >
      {isExpanded && (
        <button
          type="button"
          onClick={() => { setIsExpanded(false); setQuery(''); }}
          className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
          aria-label="Close search"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <label className="sr-only" htmlFor="search-input">
        Search articles
      </label>
      <div className="relative">
        {/* Search icon / spinner */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </span>
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search articles..."
          className={`w-full bg-neutral-100 text-neutral-900 placeholder-neutral-400 border border-transparent rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-colors outline-none ${isHeader ? 'pl-10 pr-10 h-9 text-sm' : 'pl-10 pr-10 h-12 text-base'}`}
          aria-label="Search articles"
          autoComplete="off"
          spellCheck={false}
        />
        {/* Clear button */}
        {hasQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Header variant on mobile: show icon button that expands to overlay
  if (isHeader) {
    return (
      <>
        {/* Desktop: always visible */}
        <div className="hidden md:block w-full max-w-xs">{inputContent}</div>
        {/* Mobile: icon button + expandable overlay */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-md focus-visible:ring-2 focus-visible:ring-neutral-500"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>
          {/* Backdrop + expanded overlay */}
          {isExpanded && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-[calc(var(--z-modal)-1)]"
                onClick={() => { setIsExpanded(false); setQuery(''); }}
                aria-hidden="true"
              />
              {inputContent}
            </>
          )}
        </div>
      </>
    );
  }

  // Page variant
  return inputContent;
}
