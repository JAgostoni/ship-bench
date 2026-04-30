import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getArticles, searchArticles, type Article } from '../lib/api';
import ArticleList from '../components/ArticleList';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { SearchX, FileText, RefreshCw } from 'lucide-react';

export default function Home() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (query.trim()) {
        const results = await searchArticles(query.trim());
        setArticles(results);
      } else {
        const data = await getArticles();
        setArticles(data.articles);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="sr-only">All Articles</h1>

      {query.trim() && (
        <p className="text-sm text-slate-600 mb-4" aria-live="polite">
          {loading
            ? `Searching for "${query}"...`
            : `${articles.length} result${articles.length === 1 ? '' : 's'} for "${query}"`}
        </p>
      )}

      {!query.trim() && !loading && (
        <p className="text-sm text-slate-600 mb-4">
          {articles.length} article{articles.length === 1 ? '' : 's'}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger flex items-start gap-3">
          <span className="font-medium">Error:</span> {error}
          <button
            type="button"
            onClick={fetchData}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-danger text-danger text-xs font-medium hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-danger"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : articles.length === 0 && query.trim() ? (
        <EmptyState
          icon={SearchX}
          title="No results found"
          description={`We couldn't find any articles matching "${query}".`}
        />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No articles yet"
          description="Get started by creating your first article."
        />
      ) : (
        <ArticleList articles={articles} />
      )}
    </div>
  );
}
