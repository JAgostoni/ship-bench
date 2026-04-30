import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArticleCreateSchema } from '@shared/schemas';
import {
  getArticle,
  getCategories,
  createArticle,
  updateArticle,
  type Article,
  type CategoryWithCount,
} from '../lib/api';
import MarkdownEditor from '../components/MarkdownEditor';
import TagInput from '../components/TagInput';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2, Cloud, CloudOff } from 'lucide-react';

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'local';

interface Draft {
  title: string;
  content: string;
  categoryId: number | null;
  tags: string[];
  savedAt: string;
}

function getDraftKey(slug?: string) {
  return slug ? `draft:${slug}` : 'draft:new';
}

function loadDraft(slug?: string): Draft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function saveDraft(slug: string | undefined, draft: Draft) {
  try {
    localStorage.setItem(getDraftKey(slug), JSON.stringify(draft));
  } catch {
    // ignore localStorage errors
  }
}

function clearDraft(slug: string | undefined) {
  try {
    localStorage.removeItem(getDraftKey(slug));
  } catch {
    // ignore
  }
}

function isDraftNewerThanArticle(draft: Draft, article: Article) {
  return new Date(draft.savedAt).getTime() > new Date(article.updatedAt).getTime();
}

export default function ArticleEdit() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = !slug;

  const [original, setOriginal] = useState<{
    title: string;
    content: string;
    categoryId: number | null;
    tags: string[];
  } | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingArticle, setLoadingArticle] = useState(!isNew);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ variant: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load article (edit mode) and categories
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingCategories(true);
      try {
        const cats = await getCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        // Category load failure is non-critical
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }

      if (!isNew && slug) {
        setLoadingArticle(true);
        try {
          const article = await getArticle(slug);
          if (cancelled) return;
          const orig = {
            title: article.title,
            content: article.content,
            categoryId: article.categoryId,
            tags: article.tags.map((t) => t.name),
          };
          setOriginal(orig);
          setTitle(orig.title);
          setContent(orig.content);
          setCategoryId(orig.categoryId);
          setTags(orig.tags);

          // Check localStorage draft
          const draft = loadDraft(slug);
          if (draft && isDraftNewerThanArticle(draft, article)) {
            setTitle(draft.title);
            setContent(draft.content);
            setCategoryId(draft.categoryId);
            setTags(draft.tags);
            setAutosaveStatus('local');
            setToast({ variant: 'info', message: 'Restored unsaved draft from local storage.' });
          }
        } catch (e) {
          if (!cancelled) {
            if ((e as unknown as { code?: string }).code === 'NOT_FOUND') {
              setNotFound(true);
            } else {
              setLoadError(e instanceof Error ? e.message : 'Failed to load article');
            }
          }
        } finally {
          if (!cancelled) setLoadingArticle(false);
        }
      } else {
        // New article: check draft
        const draft = loadDraft();
        if (draft && (draft.title || draft.content)) {
          setTitle(draft.title);
          setContent(draft.content);
          setCategoryId(draft.categoryId);
          setTags(draft.tags);
          setAutosaveStatus('local');
        }
        setOriginal({ title: '', content: '', categoryId: null, tags: [] });
        setLoadingArticle(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isNew, slug]);

  const dirty = useMemo(() => {
    if (!original) return false;
    return (
      title !== original.title ||
      content !== original.content ||
      categoryId !== original.categoryId ||
      tags.length !== original.tags.length ||
      tags.some((t, i) => t !== original.tags[i])
    );
  }, [title, content, categoryId, tags, original]);

  const formValid = useMemo(() => {
    const result = ArticleCreateSchema.safeParse({
      title,
      content,
      categoryId,
      tagNames: tags,
    });
    return result.success;
  }, [title, content, categoryId, tags]);

  // Autosave to localStorage
  useEffect(() => {
    if (!dirty) {
      setAutosaveStatus('idle');
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setAutosaveStatus('saving');

    autosaveTimerRef.current = setTimeout(() => {
      saveDraft(slug, { title, content, categoryId, tags, savedAt: new Date().toISOString() });
      setAutosaveStatus('saved');
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
      savedFadeTimerRef.current = setTimeout(() => {
        setAutosaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2000);
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (savedFadeTimerRef.current) clearTimeout(savedFadeTimerRef.current);
    };
  }, [dirty, title, content, categoryId, tags, slug]);

  // Clear localStorage draft when user reverts all changes
  useEffect(() => {
    if (!dirty) {
      clearDraft(slug);
    }
  }, [dirty, slug]);

  // beforeunload guard
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const validateField = useCallback(
    (field: 'title' | 'content') => {
      const result = ArticleCreateSchema.safeParse({
        title,
        content,
        categoryId,
        tagNames: tags,
      });
      if (result.success) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return;
      }
      const issues = result.error.issues;
      const issue = issues.find((i) => i.path[0] === field);
      if (issue) {
        setFieldErrors((prev) => ({ ...prev, [field]: issue.message }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [title, content, categoryId, tags]
  );

  const handleSave = async () => {
    setServerError(null);
    const result = ArticleCreateSchema.safeParse({
      title,
      content,
      categoryId,
      tagNames: tags,
    });
    if (!result.success) {
      const issues = result.error.issues;
      const map: Record<string, string> = {};
      issues.forEach((i) => {
        const key = String(i.path[0] ?? 'general');
        if (!map[key]) map[key] = i.message;
      });
      setFieldErrors(map);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      if (isNew) {
        const article = await createArticle({
          title,
          content,
          categoryId,
          tagNames: tags,
        });
        clearDraft(undefined);
        setToast({ variant: 'success', message: 'Article created.' });
        setTimeout(() => navigate(`/articles/${article.slug}`), 400);
      } else if (slug) {
        const article = await updateArticle(slug, {
          title,
          content,
          categoryId,
          tagNames: tags,
        });
        clearDraft(slug);
        setToast({ variant: 'success', message: 'Article saved.' });
        setTimeout(() => navigate(`/articles/${article.slug}`), 400);
      }
    } catch (e) {
      const err = e as unknown as { code?: string; message?: string; details?: Array<{ field: string; message: string }> };
      if (err.details && Array.isArray(err.details)) {
        const map: Record<string, string> = {};
        err.details.forEach((d) => {
          if (d.field) map[d.field] = d.message;
        });
        setFieldErrors(map);
      }
      if (err.code === 'CONFLICT') {
        setFieldErrors((prev) => ({
          ...prev,
          title: 'An article with a similar title already exists.',
        }));
      }
      setServerError(err.message ?? 'Failed to save article');
      setAutosaveStatus('local');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/');
    } else if (slug) {
      navigate(`/articles/${slug}`);
    }
  };

  const breadcrumbLabel = isNew
    ? 'New Article'
    : original
      ? `Edit '${original.title}'`
      : 'Edit Article';

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-20 md:p-6">
        <EmptyState
          icon={AlertCircle}
          title="Article not found"
          description="The article you're trying to edit doesn't exist or has been removed."
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

  if (loadingArticle || loadingCategories) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-20 md:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-20 md:p-6">
      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {serverError && (
        <div className="mb-4 rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger flex items-start gap-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger flex items-start gap-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 text-sm text-slate-600">
          <li>
            <Link to="/" className="hover:text-accent focus-visible:ring-2 focus-visible:ring-accent rounded">
              Articles
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-900 font-medium truncate" aria-current="page">
            {breadcrumbLabel}
          </li>
        </ol>
      </nav>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!formValid || !dirty || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
              <span className="text-text-tertiary">Saving...</span>
            </>
          )}
          {autosaveStatus === 'saved' && (
            <>
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-success">Saved</span>
            </>
          )}
          {autosaveStatus === 'local' && (
            <>
              <CloudOff className="w-4 h-4 text-amber-500" />
              <span className="text-amber-600">Draft saved locally</span>
            </>
          )}
          {autosaveStatus === 'idle' && dirty && (
            <>
              <Cloud className="w-4 h-4 text-text-tertiary" />
              <span className="text-text-tertiary">Unsaved changes</span>
            </>
          )}
        </div>
      </div>

      {/* Title input */}
      <div className="mb-5">
        <label htmlFor="article-title" className="sr-only">
          Article title
        </label>
        <input
          id="article-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.title;
              return next;
            });
          }}
          onBlur={() => validateField('title')}
          placeholder="Article title"
          maxLength={200}
          className={`w-full text-2xl font-bold bg-transparent border-b-2 pb-2 outline-none placeholder:text-text-tertiary transition-colors ${
            fieldErrors.title
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-slate-200 focus:border-blue-600'
          }`}
        />
        {fieldErrors.title && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Category dropdown */}
      <div className="mb-5">
        <label htmlFor="article-category" className="block text-sm font-medium text-text-secondary mb-1.5">
          Category
        </label>
        <select
          id="article-category"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          className="w-full md:w-auto min-h-[40px] px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">None</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div className="mb-5">
        <label htmlFor="article-tags" className="block text-sm font-medium text-text-secondary mb-1.5">
          Tags
        </label>
        <TagInput tags={tags} onChange={setTags} />
        {fieldErrors.tagNames && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors.tagNames}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="mb-6">
        <label htmlFor="article-content" className="sr-only">
          Article content
        </label>
        <MarkdownEditor
          value={content}
          onChange={(v) => {
            setContent(v);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.content;
              return next;
            });
          }}
          placeholder="Write in Markdown..."
        />
        {fieldErrors.content && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors.content}
          </p>
        )}
      </div>

      {/* Mobile sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 flex items-center justify-between gap-2 z-40 md:hidden">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!formValid || !dirty || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
