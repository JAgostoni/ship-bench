import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Article } from '../lib/api';
import { formatRelativeTime } from '../lib/time';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-accent"
    >
      <h3 className="text-lg font-medium text-slate-900 group-hover:underline decoration-accent underline-offset-2">
        {article.title}
      </h3>
      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{article.excerpt}</p>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatRelativeTime(article.updatedAt)}
        </span>
        {article.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            {article.category.name}
          </span>
        )}
        {article.tags.length > 0 && (
          <span className="text-xs text-slate-500">
            {article.tags.map((t) => `#${t.name}`).join(' ')}
          </span>
        )}
      </div>
    </Link>
  );
}
