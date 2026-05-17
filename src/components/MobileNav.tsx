'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, Search, Plus, X } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { CategoryNav } from './CategoryNav';
import type { CategoryDTO } from '@/types';

interface MobileNavProps {
  categories: CategoryDTO[];
}

export function MobileNav({ categories }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, searchParams]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [drawerOpen]);

  // Focus trap + Escape key while drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const elements = Array.from(focusable);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex md:hidden flex-col shrink-0">
      {/* Top Nav Bar */}
      {searchOpen ? (
        <div
          className="h-12 flex items-center gap-2 px-4 border-b"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <SearchBar id="mobile-search-input" autoFocus />
          <button
            onClick={() => setSearchOpen(false)}
            className="flex-shrink-0 flex items-center justify-center rounded transition-colors duration-100"
            style={{ minWidth: '44px', minHeight: '44px', color: 'var(--color-text-secondary)' }}
            aria-label="Close search"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className="h-12 flex items-center px-4 border-b"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center rounded transition-colors duration-100 -ml-2"
            style={{ minWidth: '44px', minHeight: '44px', color: 'var(--color-text-primary)' }}
            aria-label="Open navigation"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <span
            className="flex-1 text-center text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Knowledge Base
          </span>

          <div className="flex items-center -mr-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center rounded transition-colors duration-100"
              style={{ minWidth: '44px', minHeight: '44px', color: 'var(--color-text-primary)' }}
              aria-label="Search"
            >
              <Search size={20} aria-hidden="true" />
            </button>
            <Link
              href="/articles/new"
              className="flex items-center justify-center rounded transition-colors duration-100"
              style={{ minWidth: '44px', minHeight: '44px', color: 'var(--color-text-primary)' }}
              aria-label="New article"
            >
              <Plus size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed top-0 left-0 h-full z-50 flex flex-col max-w-[280px] w-full shadow-xl rounded-r-lg transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="px-4 pt-6 pb-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Drawer header */}
          <div className="flex items-center justify-between">
            <span
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Knowledge Base
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-center rounded transition-colors duration-100"
              style={{ minWidth: '44px', minHeight: '44px', color: 'var(--color-text-secondary)' }}
              aria-label="Close navigation"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Search */}
          <SearchBar id="drawer-search-input" />

          {/* Categories */}
          <div>
            <p
              className="text-[11px] uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}
            >
              Categories
            </p>
            <CategoryNav categories={categories} />
          </div>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <Link
            href="/articles/new"
            className="w-full h-11 px-4 flex items-center justify-center rounded-md font-medium text-white text-sm transition-colors duration-100
                       hover:bg-[--color-accent-hover]
                       focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + New Article
          </Link>
        </div>
      </div>
    </div>
  );
}
