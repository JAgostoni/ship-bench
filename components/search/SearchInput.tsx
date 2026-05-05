'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SearchResult } from '@/src/lib/search';
import { SearchDropdown } from './SearchDropdown';

const DEBOUNCE_MS = 250;

export function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = `/api/search?q=${encodeURIComponent(searchQuery)}&limit=${8}`;
      const res = await fetch(url);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = await res.json();
      setResults(json.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (value.trim()) {
        setIsOpen(true);
        debounceRef.current = setTimeout(() => {
          fetchResults(value);
        }, DEBOUNCE_MS);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    },
    [fetchResults],
  );

  const handleFocus = useCallback(() => {
    if (query.trim()) {
      setIsOpen(true);
    }
  }, [query]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden md:flex md:flex-1 md:justify-center">
      <div className="w-full max-w-md">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="Search articles…"
          aria-label="Search articles"
          aria-expanded={isOpen}
          aria-controls="search-dropdown"
          className={`w-full rounded-md border bg-[var(--color-surface)] px-3 py-2 text-sm h-10 transition-shadow ${
            isOpen
              ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
              : 'border-[var(--color-border)]'
          }`}
        />
        <div id="search-dropdown">
          <SearchDropdown
            results={results}
            query={query}
            isLoading={isLoading}
            isOpen={isOpen}
            onSelect={handleClose}
          />
        </div>
      </div>
    </div>
  );
}
