'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { CategoryDTO } from '@/types';

interface CategoryNavProps {
  categories: CategoryDTO[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('category');

  const linkClass =
    'flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors duration-100 ' +
    'hover:bg-[--color-accent-subtle] hover:text-[--color-text-primary] ' +
    'aria-[current=page]:bg-[--color-accent-subtle] aria-[current=page]:text-[--color-accent] ' +
    'aria-[current=page]:font-medium aria-[current=page]:border-l-2 aria-[current=page]:border-[--color-accent]';

  return (
    <nav aria-label="Categories">
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/articles"
            className={linkClass}
            style={{ color: activeSlug === null ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
            aria-current={activeSlug === null ? 'page' : undefined}
          >
            All Articles
          </Link>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/articles?category=${cat.slug}`}
              className={linkClass}
              style={{ color: activeSlug === cat.slug ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
              aria-current={activeSlug === cat.slug ? 'page' : undefined}
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
