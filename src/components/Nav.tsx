import Link from 'next/link';
import { Suspense } from 'react';
import { listCategories } from '@/lib/categories';
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
            className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors duration-100"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            All Articles
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/articles?category=${cat.slug}`}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors duration-100"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function Nav() {
  const categories = await listCategories();

  return (
    <aside
      className="flex flex-col w-[240px] shrink-0 border-r overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
        <h1
          className="text-base font-semibold"
          aria-label="Knowledge Base"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Knowledge Base
        </h1>

        <Suspense fallback={<div className="h-9 rounded-md animate-pulse" style={{ backgroundColor: 'var(--color-surface-raised)' }} />}>
          <SearchBar />
        </Suspense>

        <div>
          <p
            className="text-[11px] uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-muted)', marginTop: '20px' }}
          >
            Categories
          </p>
          <Suspense fallback={<CategoryNavFallback categories={categories} />}>
            <CategoryNav categories={categories} />
          </Suspense>
        </div>

        <hr style={{ borderColor: 'var(--color-border)' }} />

        <Link
          href="/articles/new"
          className="w-full h-10 px-4 flex items-center justify-center rounded-md font-medium text-white text-sm transition-colors duration-100
                     hover:bg-[--color-accent-hover]
                     focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          + New Article
        </Link>
      </div>
    </aside>
  );
}
