import Link from 'next/link';
import { Suspense } from 'react';
import { FileText, Plus } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { CategoryNav } from './CategoryNav';
import type { CategoryDTO } from '@/types';

function CategoryNavFallback({ categories }: { categories: CategoryDTO[] }) {
  return (
    <nav aria-label="Categories">
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/articles"
            className="flex items-center gap-2 px-3 py-3 lg:py-2 rounded text-sm transition-colors duration-100 justify-center lg:justify-start"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 lg:hidden" style={{ backgroundColor: 'var(--color-text-muted)' }} aria-hidden="true" />
            <span className="hidden lg:inline">All Articles</span>
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/articles?category=${cat.slug}`}
              className="flex items-center gap-2 px-3 py-3 lg:py-2 rounded text-sm transition-colors duration-100 justify-center lg:justify-start"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 lg:hidden" style={{ backgroundColor: 'var(--color-text-muted)' }} aria-hidden="true" />
              <span className="hidden lg:inline">{cat.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface NavProps {
  categories: CategoryDTO[];
}

export function Nav({ categories }: NavProps) {
  return (
    <aside
      className="hidden md:flex flex-col md:w-16 lg:w-[240px] shrink-0 border-r overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="px-2 lg:px-4 pt-6 pb-4 flex flex-col gap-4">
        {/* App name: icon at tablet, text at desktop */}
        <div className="flex items-center justify-center lg:justify-start min-h-[24px]">
          <FileText
            size={20}
            className="lg:hidden"
            aria-hidden="true"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <h1
            className="hidden lg:block text-base font-semibold"
            aria-label="Knowledge Base"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Knowledge Base
          </h1>
        </div>

        {/* Search bar: hidden at tablet, visible at desktop */}
        <div className="hidden lg:block">
          <Suspense fallback={<div className="h-9 rounded-md animate-pulse" style={{ backgroundColor: 'var(--color-surface-raised)' }} />}>
            <SearchBar />
          </Suspense>
        </div>

        <div>
          {/* Category label: hidden at tablet, visible at desktop */}
          <p
            className="hidden lg:block text-[11px] uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}
          >
            Categories
          </p>
          <Suspense fallback={<CategoryNavFallback categories={categories} />}>
            <CategoryNav categories={categories} />
          </Suspense>
        </div>

        {/* HR: hidden at tablet, visible at desktop */}
        <hr className="hidden lg:block" style={{ borderColor: 'var(--color-border)' }} />

        {/* New Article: icon-only at tablet, full button at desktop */}
        <Link
          href="/articles/new"
          aria-label="New article"
          className="flex items-center justify-center rounded-md font-medium text-white text-sm transition-colors duration-100
                     md:w-10 md:h-10 lg:w-full lg:h-10 lg:px-4
                     hover:bg-[--color-accent-hover]
                     focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Plus size={20} className="lg:hidden" aria-hidden="true" />
          <span className="hidden lg:inline">+ New Article</span>
        </Link>
      </div>
    </aside>
  );
}
