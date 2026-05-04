import { ArticleCard } from './ArticleCard';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

interface ArticleData {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  categoryName?: string;
}

interface ArticleListProps {
  articles: ArticleData[];
  state: 'loading' | 'empty' | 'error' | 'ready';
  hasNextPage?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
}

export function ArticleList({
  articles,
  state,
  hasNextPage,
  onLoadMore,
}: ArticleListProps) {
  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <EmptyState
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        }
        title="No articles yet"
        description="Create your first article to get started."
        actionLabel="Create article"
        onAction={() => {
          if (typeof window !== 'undefined') window.location.href = '/articles/new';
        }}
      />
    );
  }

  if (state === 'error') {
    return (
      <EmptyState
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        }
        title="Something went wrong"
        description="Failed to load articles. Please try again."
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
      {hasNextPage && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button variant="tertiary" size="md" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
