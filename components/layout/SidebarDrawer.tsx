'use client';

import { Sidebar } from './Sidebar';

interface SidebarCategory {
  slug: string;
  name: string;
  count: number;
}

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: SidebarCategory[];
  activeCategory?: string;
  onSelect?: (slug: string) => void;
  totalArticles: number;
}

export function SidebarDrawer({
  open,
  onClose,
  categories,
  activeCategory,
  onSelect,
  totalArticles,
}: SidebarDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 z-[var(--z-overlay)] w-[240px] bg-[var(--color-bg)] lg:hidden"
        style={{ top: '3.5rem' }}
        role="dialog"
        aria-modal="true"
        aria-label="Categories"
      >
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelect={(slug) => {
            onSelect?.(slug);
            onClose();
          }}
          totalArticles={totalArticles}
        />
      </div>
    </>
  );
}
