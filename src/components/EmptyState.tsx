import Link from 'next/link';
import { FileText, SearchX, FolderOpen } from 'lucide-react';

type EmptyStateVariant = 'empty' | 'no-results' | 'no-category';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  query?: string;
  category?: string;
}

export function EmptyState({ variant, query, category }: EmptyStateProps) {
  const Icon =
    variant === 'empty' ? FileText : variant === 'no-results' ? SearchX : FolderOpen;

  const heading =
    variant === 'empty'
      ? 'No articles yet'
      : variant === 'no-results'
        ? `No results for "${query}"`
        : `No articles in ${category ?? 'this category'}`;

  const body =
    variant === 'empty'
      ? 'This knowledge base is empty. Add the first article to get started.'
      : variant === 'no-results'
        ? 'Try a different search term or browse all articles.'
        : 'There are no articles in this category yet.';

  return (
    <div
      role="status"
      className="min-h-[320px] flex flex-col items-center justify-center gap-4 text-center"
    >
      <Icon
        size={48}
        aria-hidden="true"
        style={{ color: 'var(--color-text-muted)' }}
      />
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {heading}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {body}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {variant === 'empty' && (
          <Link
            href="/articles/new"
            className="h-10 px-4 inline-flex items-center rounded-md font-medium text-white transition-colors duration-100"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + New Article
          </Link>
        )}
        {variant === 'no-results' && (
          <>
            <Link
              href="/articles"
              className="font-medium transition-colors duration-100"
              style={{ color: 'var(--color-accent)' }}
            >
              Clear search
            </Link>
            <span style={{ color: 'var(--color-text-muted)' }}>or</span>
            <Link
              href="/articles"
              className="font-medium transition-colors duration-100"
              style={{ color: 'var(--color-accent)' }}
            >
              Browse all
            </Link>
          </>
        )}
        {variant === 'no-category' && (
          <Link
            href="/articles"
            className="font-medium transition-colors duration-100"
            style={{ color: 'var(--color-accent)' }}
          >
            Browse all articles
          </Link>
        )}
      </div>
    </div>
  );
}
