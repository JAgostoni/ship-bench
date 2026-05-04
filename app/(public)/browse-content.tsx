'use client';

import { useState } from 'react';
import { ArticleList } from '@/components/article/ArticleList';
import { SidebarDrawer } from '@/components/layout/SidebarDrawer';

interface ArticleData {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  categoryName?: string;
}

interface BrowseContentProps {
  initialArticles: ArticleData[];
  nextCursor: string | null;
  sidebarCategories: Array<{ slug: string; name: string; count: number }>;
  totalArticles: number;
}

export function BrowseContent({
  initialArticles,
  nextCursor,
  sidebarCategories,
  totalArticles,
}: BrowseContentProps) {
  const [allArticles, setAllArticles] = useState(initialArticles);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loading, setLoading] = useState(false);

  const handleLoadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/articles?limit=20&cursor=${encodeURIComponent(cursor)}`);
      const data = await response.json();
      setAllArticles((prev) => [...prev, ...data.articles]);
      setCursor(data.nextCursor);
    } catch {
      // Silently handle error — user can retry
    } finally {
      setLoading(false);
    }
  };

  const state: 'empty' | 'ready' =
    allArticles.length === 0 ? 'empty' : 'ready';

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile/Tablet hamburger header */}
      <div className="py-4 px-4 lg:hidden">
        <button
          className="rounded-md p-2 text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sidebar drawer for mobile/tablet */}
      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        categories={sidebarCategories}
        totalArticles={totalArticles}
      />

      <div className="px-4 py-4 lg:px-6">
        <ArticleList
          articles={allArticles}
          state={state}
          hasNextPage={cursor !== null}
          onLoadMore={handleLoadMore}
        />
      </div>
    </>
  );
}
