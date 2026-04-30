import type { Article } from '../lib/api';
import ArticleCard from './ArticleCard';
import EmptyState from './EmptyState';
import { FileText } from 'lucide-react';

interface ArticleListProps {
  articles: Article[];
}

export default function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No articles yet"
        description="Get started by creating your first article."
      />
    );
  }

  return (
    <div className="space-y-3" role="list">
      {articles.map((article) => (
        <div key={article.id} role="listitem">
          <ArticleCard article={article} />
        </div>
      ))}
    </div>
  );
}
