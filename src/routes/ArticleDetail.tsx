import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getArticle, deleteArticle, type Article } from '../lib/api';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import Skeleton from '../components/Skeleton';
import { formatDate } from '../lib/time';
import { ArrowLeft, Pencil, Trash2, FileX } from 'lucide-react';

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getArticle(slug);
      setArticle(data);
    } catch (e) {
      if (e instanceof Error && (e as unknown as { code?: string }).code === 'NOT_FOUND') {
        setArticle(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load article');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleDelete = async () => {
    if (!slug) return;
    setDeleting(true);
    try {
      await deleteArticle(slug);
      setDeleteOpen(false);
      setToast({ variant: 'success', message: 'Article deleted.' });
      setTimeout(() => navigate('/'), 800);
    } catch (e) {
      setDeleteOpen(false);
      setToast({
        variant: 'error',
        message: e instanceof Error ? e.message : 'Failed to delete article',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!article && !error) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <EmptyState
          icon={FileX}
          title="Article not found"
          description="The article you're looking for doesn't exist or has been removed."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to articles
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto p-4 md:p-6">
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {article && (
        <>
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-slate-600">
              <li>
                <Link to="/" className="hover:text-accent focus-visible:ring-2 focus-visible:ring-accent rounded">
                  Articles
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-900 font-medium truncate" aria-current="page">
                {article.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900">{article.title}</h1>
            <div className="flex items-center gap-2 md:shrink-0">
              <Link
                to={`/articles/${article.slug}/edit`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-danger hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-danger"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-8">
            <span>{formatDate(article.updatedAt)}</span>
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

          <div className="prose prose-slate max-w-[65ch]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ children, className, ...props }) {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-slate-100 rounded-sm px-1 font-mono text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-slate-50 border rounded-md p-4 overflow-auto">
                      <code className={`font-mono text-sm ${className ?? ''}`} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          <div className="mt-10 pt-6 border-t border-border">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to articles
            </Link>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteOpen}
        title="Delete article"
        description={`Are you sure you want to delete "${article?.title ?? 'this article'}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </article>
  );
}
