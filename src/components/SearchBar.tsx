'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  id?: string;
  autoFocus?: boolean;
}

export function SearchBar({ id = 'search-input', autoFocus = false }: SearchBarProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const navigate = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q) {
        router.push(`?q=${encodeURIComponent(q)}`, { scroll: false });
      } else {
        router.push('/articles', { scroll: false });
      }
    },
    [router],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(q), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(value);
    } else if (e.key === 'Escape') {
      setValue('');
      navigate('');
    }
  };

  const handleClear = () => {
    setValue('');
    navigate('');
  };

  return (
    <div className="relative flex items-center">
      <label htmlFor={id} className="sr-only">
        Search articles
      </label>
      <Search
        size={16}
        aria-hidden="true"
        className="absolute left-2 pointer-events-none"
        style={{ color: value ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        placeholder="Search articles…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full h-9 pl-8 pr-8 text-sm border rounded-md outline-none transition-colors duration-100"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded transition-colors duration-100"
          style={{ color: 'var(--color-text-muted)', minWidth: '44px', minHeight: '44px' }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
