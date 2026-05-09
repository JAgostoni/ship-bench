import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { relativeTime } from '@/lib/utils';

interface ArticleCardProps {
  article: {
    title: string;
    slug: string;
    excerpt?: string | null;
    category?: { id: number; name: string; slug: string } | null;
    status: string;
    updatedAt: Date | string;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const { title, slug, excerpt, category, status, updatedAt } = article;

  return (
    <article className="border-b border-neutral-200 py-4 px-1 hover:bg-neutral-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
        {/* Left: title + excerpt */}
        <div className="flex-1 min-w-0">
          <h3>
            <Link
              href={`/articles/${slug}`}
              className="text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline focus-visible:ring-2 focus-visible:ring-neutral-500 rounded"
            >
              {title}
            </Link>
          </h3>
          {excerpt && (
            <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{excerpt}</p>
          )}
        </div>

        {/* Right: category badge + timestamp */}
        <div className="flex sm:flex-col sm:items-end items-center gap-2 mt-1 sm:mt-0 sm:ml-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {category && <Badge variant="neutral">{category.name}</Badge>}
            {status === 'draft' && <Badge variant="warning">Draft</Badge>}
          </div>
          <time dateTime={new Date(updatedAt).toISOString()} className="text-xs text-neutral-400 whitespace-nowrap">
            {relativeTime(updatedAt)}
          </time>
        </div>
      </div>
    </article>
  );
}
