'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[var(--z-header)] flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4"
      role="banner"
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <button
          className="sr-only p-2 md:not-sr-only"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link
          href="/"
          className="text-lg font-bold text-[var(--color-text)] no-underline hover:text-[var(--color-accent)]"
        >
          KB
        </Link>
      </div>

      {/* Center: Search placeholder (non-functional for now) */}
      <div className="hidden flex-1 justify-center md:flex">
        <div className="w-full max-w-md rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] h-10">
          Search articles…
        </div>
      </div>

      {/* Right: New button */}
      <Button variant="primary" size="sm">
        + New
      </Button>
    </header>
  );
}
