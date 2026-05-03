import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, X } from 'lucide-react';

export default function SearchInput() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed) {
        setSearchParams({ q: trimmed });
      } else {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('q');
          return next;
        });
      }
      setLoading(false);
    },
    [setSearchParams]
  );

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q !== query) {
      setQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      performSearch(query);
    } else if (e.key === 'Escape') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setQuery('');
      performSearch('');
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    performSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading ? (
          <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-text-tertiary" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search articles..."
        className="w-full pl-9 pr-8 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="Search articles"
      />
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 text-text-tertiary" />
        </button>
      )}
    </div>
  );
}
