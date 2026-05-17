'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CATEGORY_COLORS } from './CategoryBadge';
import type { CategoryDTO } from '@/types';

interface CategoryNavProps {
  categories: CategoryDTO[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('category');

  const linkClass =
    'flex items-center gap-2 px-3 py-3 lg:py-2 rounded text-sm transition-colors duration-100 ' +
    'justify-center lg:justify-start ' +
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
            title="All Articles"
          >
            {/* Monogram dot visible at tablet (md), hidden at desktop (lg) */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 lg:hidden"
              style={{
                backgroundColor: activeSlug === null ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
              aria-hidden="true"
            />
            {/* Text visible at desktop (lg), hidden at tablet (md) */}
            <span className="hidden lg:inline">All Articles</span>
          </Link>
        </li>
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
          const isActive = activeSlug === cat.slug;
          return (
            <li key={cat.id}>
              <Link
                href={`/articles?category=${cat.slug}`}
                className={linkClass}
                style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                aria-current={isActive ? 'page' : undefined}
                title={cat.name}
              >
                {/* Colored dot visible at tablet (md), hidden at desktop (lg) */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 lg:hidden"
                  style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
                  aria-hidden="true"
                />
                {/* Text visible at desktop (lg), hidden at tablet (md) */}
                <span className="hidden lg:inline">{cat.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
