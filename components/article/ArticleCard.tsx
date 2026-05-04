'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    categoryName?: string;
  };
  variant?: 'default' | 'selected';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^>\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const preview = stripMarkdown(article.content).slice(0, 200);
  const timeAgo = formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true });

  return (
    <Link
      href={`/articles/${article.id}`}
      className={[
        'group block rounded-md border p-4 transition-all',
        variant === 'selected'
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:shadow-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
      ].join(' ')}
    >
      {/* Title */}
      <h2 className="mb-1 text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
        {article.title}
      </h2>

      {/* Preview */}
      {preview && (
        <p className="mb-2 text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
          {preview}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        {article.categoryName && (
          <span>{article.categoryName}</span>
        )}
        {article.categoryName && <span>•</span>}
        <time dateTime={article.updatedAt}>{timeAgo}</time>
      </div>
    </Link>
  );
}
