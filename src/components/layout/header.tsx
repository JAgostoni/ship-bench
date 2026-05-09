'use client';

import Link from 'next/link';
import { BookOpen, Menu, Plus, X } from 'lucide-react';
import Button from '@/components/ui/button';

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  searchSlot?: React.ReactNode;
}

export function Header({ onMenuToggle, isMenuOpen, searchSlot }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--z-header)] h-14 md:h-16 bg-white shadow-sm">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 rounded-md focus-visible:ring-2 focus-visible:ring-neutral-500"
            onClick={onMenuToggle}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2 text-neutral-900 hover:text-neutral-700 transition-colors">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold text-base hidden sm:inline">Knowledge Base</span>
            <span className="font-semibold text-base sm:hidden">KB</span>
          </Link>
        </div>

        {/* Center: search slot */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4 justify-center">
          {searchSlot}
        </div>

        {/* Right: New Article button */}
        <div className="flex items-center gap-2">
          {/* Mobile search slot */}
          <div className="md:hidden">{searchSlot}</div>
          <Link
            href="/articles/new"
            className="hidden md:inline-flex"
          >
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Article
            </Button>
          </Link>
          <Link
            href="/articles/new"
            className="md:hidden"
            aria-label="New article"
          >
            <Button variant="ghost" size="sm">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
