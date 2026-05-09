import { FileText } from 'lucide-react';
import { ArticleCard } from './article-card';
import { EmptyState } from '@/components/ui/empty-state';

interface Article {
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: { id: number; name: string; slug: string } | null;
  status: string;
  updatedAt: Date | string;
}

interface ArticleListProps {
  articles: Article[];
  loading?: boolean;
  emptyStateProps?: {
    icon?: typeof FileText;
    title: string;
    description: string;
    action?: { label: string; href: string };
  };
}

function SkeletonCard() {
  return (
    <div className="border-b border-neutral-200 py-4 px-1 animate-pulse" aria-hidden="true">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-neutral-200 rounded w-2/3" />
          <div className="h-4 bg-neutral-200 rounded w-full" />
          <div className="h-4 bg-neutral-200 rounded w-4/5" />
        </div>
        <div className="flex sm:flex-col sm:items-end gap-2 mt-1 sm:mt-0">
          <div className="h-5 bg-neutral-200 rounded w-16" />
          <div className="h-3 bg-neutral-200 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export function ArticleList({ articles, loading = false, emptyStateProps }: ArticleListProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading articles">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={emptyStateProps?.icon ?? FileText}
        title={emptyStateProps?.title ?? 'No articles yet'}
        description={emptyStateProps?.description ?? 'Create your first article to get started.'}
        action={emptyStateProps?.action ?? { label: 'Create article', href: '/articles/new' }}
      />
    );
  }

  return (
    <div>
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </div>
  );
}
