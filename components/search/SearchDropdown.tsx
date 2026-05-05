'use client';

import React from 'react';
import Link from 'next/link';

interface SearchDropdownProps {
  results: Array<{
    id: string;
    title: string;
    contentSnippet: string;
    categoryName: string | null;
  }>;
  query: string;
  isLoading: boolean;
  isOpen: boolean;
  onSelect: () => void;
}

export function SearchDropdown({
  results,
  query,
  isLoading,
  isOpen,
  onSelect,
}: SearchDropdownProps) {
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  React.useEffect(() => {
    // Reset highlighted index when results change
    setHighlightedIndex(-1);
  }, [results]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSelect(); // Close dropdown
    }
  };

  if (isLoading) {
    return (
      <div
        className="absolute top-full mt-1 w-80 max-w-[360px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-lg)]"
        role="listbox"
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded bg-[var(--color-border)]"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div
        className="absolute top-full mt-1 w-80 max-w-[360px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 shadow-[var(--shadow-lg)]"
        role="listbox"
        onKeyDown={handleKeyDown}
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          No results for &quot;{query}&quot;
        </p>
      </div>
    );
  }

  const visibleResults = results.slice(0, 8);

  return (
    <div
      className="absolute top-full mt-1 w-80 max-w-[360px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-[var(--shadow-lg)]"
      role="listbox"
      onKeyDown={handleKeyDown}
    >
      {visibleResults.map((result, index) => (
        <Link
          key={result.id}
          href={`/articles/${result.id}`}
          role="option"
          aria-selected={index === highlightedIndex}
          tabIndex={-1}
          className={`flex cursor-pointer flex-col gap-0.5 px-3 py-2 ${
            index === highlightedIndex
              ? 'bg-[var(--color-accent-subtle)]'
              : 'hover:bg-[var(--color-surface-hover)]'
          }`}
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={onSelect}
        >
          <span
            className="text-sm font-semibold text-[var(--color-text)] [word-break:break-word]"
            dangerouslySetInnerHTML={{ __html: result.title }}
          />
          {result.contentSnippet && (
            <span
              className="text-xs text-[var(--color-text-muted)] [word-break:break-word]"
              dangerouslySetInnerHTML={{ __html: result.contentSnippet }}
            />
          )}
          {result.categoryName && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {result.categoryName}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
