'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  _count?: { articles: number };
  articleCount?: number;
}

interface SidebarProps {
  categories: Category[];
  activeSlug?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ categories, activeSlug, isOpen, onClose }: SidebarProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-4" aria-label="Sidebar navigation">
      {/* All Articles link */}
      <Link
        href="/"
        onClick={onClose}
        className={clsx(
          'py-2 px-3 rounded-md text-sm transition-colors',
          !activeSlug
            ? 'bg-neutral-100 font-semibold border-l-2 border-blue-600'
            : 'text-neutral-700 hover:bg-neutral-50',
        )}
      >
        All Articles
      </Link>

      {/* Category list */}
      {categories.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-4 mb-1 px-3">
            Categories
          </h3>
          {categories.map((cat) => {
            const count = cat._count?.articles ?? cat.articleCount ?? 0;
            const isActive = activeSlug === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                onClick={onClose}
                className={clsx(
                  'flex items-center justify-between py-2 px-3 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-neutral-100 font-semibold border-l-2 border-blue-600'
                    : 'text-neutral-700 hover:bg-neutral-50',
                )}
              >
                <span>{cat.name}</span>
                <span className="text-xs text-neutral-400 ml-auto">{count}</span>
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — persistent */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0 border-r border-neutral-200 h-[calc(100vh-var(--header-height))] sticky top-[var(--header-height)] overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[var(--z-sidebar-backdrop)] bg-black/30 lg:hidden motion-safe:transition-opacity motion-safe:duration-200"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside
            className={clsx(
              'fixed top-0 left-0 z-[var(--z-sidebar-drawer)] w-[280px] h-full bg-white shadow-lg overflow-y-auto lg:hidden',
              'motion-safe:transition-transform motion-safe:duration-200',
              isOpen ? 'translate-x-0' : '-translate-x-full',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <span className="font-semibold text-neutral-900">Navigation</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
