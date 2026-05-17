import Link from 'next/link';
import { CategoryBadge } from './CategoryBadge';
import { StatusBadge } from './StatusBadge';
import type { ArticleListItem } from '@/types';

function formatDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(d);
}

export function ArticleCard({ title, slug, excerpt, category, status, updatedAt }: ArticleListItem) {
  return (
    <li>
      <Link
        href={`/articles/${slug}`}
        className="block bg-white border rounded p-3 md:p-4 transition-colors duration-100
                   hover:border-[--color-accent] hover:bg-[--color-accent-subtle]
                   focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 outline-none"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start gap-2">
          {category && (
            <CategoryBadge name={category.name} colorIndex={category.colorIndex} />
          )}
          <span
            className="flex-1 text-base font-semibold leading-snug"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </span>
          <StatusBadge status={status} />
        </div>
        <p
          className="mt-1 text-sm leading-relaxed line-clamp-2"
          style={{
            color: 'var(--color-text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </p>
        <div className="mt-2 flex justify-end">
          <time
            dateTime={new Date(updatedAt).toISOString()}
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDate(updatedAt)}
          </time>
        </div>
      </Link>
    </li>
  );
}
