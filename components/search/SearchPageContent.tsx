'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

interface SearchPageContentProps {
  query: string;
}

interface SearchResult {
  id: string;
  title: string;
  contentSnippet: string;
  categoryName: string | null;
}

export function SearchPageContent({ query }: SearchPageContentProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      if (!query.trim()) {
        setHasSearched(false);
        return;
      }

      setHasSearched(true);
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <EmptyState
          icon={<span className="text-3xl">🔍</span>}
          title="Search articles"
          description="Type a query in the search bar above to find articles."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">
        {isLoading ? 'Searching…' : `Results for "${query}"`}
      </h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md bg-[var(--color-border)]"
            />
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <EmptyState
          icon={<span className="text-3xl">📭</span>}
          title="No results found"
          description={`No articles matching "${query}" were found.`}
          actionLabel="Back to articles"
          onAction={() => (window.location.href = '/')}
        />
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/articles/${result.id}`}
              className="block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]"
            >
              <h2
                className="text-base font-semibold text-[var(--color-text)] mb-1 [word-break:break-word]"
                dangerouslySetInnerHTML={{ __html: result.title }}
              />
              {result.contentSnippet && (
                <p
                  className="text-sm text-[var(--color-text-muted)] [word-break:break-word]"
                  dangerouslySetInnerHTML={{ __html: result.contentSnippet }}
                />
              )}
              {result.categoryName && (
                <span className="mt-2 inline-block text-xs text-[var(--color-text-muted)]">
                  {result.categoryName}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
