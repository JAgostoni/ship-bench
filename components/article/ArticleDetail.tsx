'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { renderMarkdown } from '@/src/lib/markdown';
import { sanitizeHtml } from '@/src/lib/sanitize';

interface ArticleDetailProps {
  article: {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
    categoryName?: string;
  };
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  const timeAgo = formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true });
  const htmlContent = sanitizeHtml(renderMarkdown(article.content));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 2L4 8l6 6" />
        </svg>
        Back
      </Link>

      {/* Title */}
      <h1 className="mb-3 text-2xl font-bold text-[var(--color-text)]">
        {article.title}
      </h1>

      {/* Meta row */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        {article.categoryName && <span>{article.categoryName}</span>}
        {article.categoryName && <span className="text-[var(--color-border-strong)]">·</span>}
        <time dateTime={article.updatedAt}>Updated {timeAgo}</time>
      </div>

      {/* Divider */}
      <hr className="mb-6 border-[var(--color-border)]" />

      {/* Content */}
      <div
        className="kb-prose"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Edit button */}
      <div className="mt-8 flex justify-end">
        <Link
          href={`/articles/${article.id}/edit`}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-subtle)]"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
