'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { clsx } from 'clsx';
import { Input } from '@/components/ui/input';
import Button from '@/components/ui/button';
import MarkdownEditor from '@/components/ui/markdown-editor';
import StatusToggle from '@/components/ui/status-toggle';
import { createArticle, updateArticle, deleteArticle } from '@/lib/actions';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ArticleData {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  categoryId?: number | null;
}

interface FormErrors {
  title?: string;
  content?: string;
}

interface ArticleFormProps {
  mode: 'create' | 'edit';
  initialData?: ArticleData;
  categories: Category[];
}

export function ArticleForm({ mode, initialData, categories }: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.categoryId ? String(initialData.categoryId) : '',
  );
  const [status, setStatus] = useState<'draft' | 'published'>(
    initialData?.status === 'published' ? 'published' : 'draft',
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!title.trim()) {
      e.title = 'Title is required';
    } else if (title.length > 200) {
      e.title = 'Title must be 200 characters or fewer';
    }
    if (!content.trim()) {
      e.content = 'Content cannot be empty';
    }
    return e;
  }

  function buildFormData(statusOverride?: 'draft' | 'published'): FormData {
    const fd = new FormData();
    fd.set('title', title);
    fd.set('content', content);
    if (categoryId) {
      fd.set('categoryId', categoryId);
    }
    fd.set('status', statusOverride ?? status);
    return fd;
  }

  async function handleSubmit(statusOverride?: 'draft' | 'published') {
    setServerError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        const fd = buildFormData(statusOverride);
        let result: { slug: string } | undefined;
        if (mode === 'create') {
          result = await createArticle(fd);
        } else if (initialData) {
          result = await updateArticle(initialData.id, fd);
        }
        if (result) {
          router.push(`/articles/${result.slug}`);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setServerError(message);
      }
    });
  }

  async function handleDelete() {
    if (!initialData) return;
    const confirmed = window.confirm('Delete this article? This cannot be undone.');
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteArticle(initialData.id);
        router.push('/?deleted=1');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete article. Please try again.';
        setServerError(message);
      }
    });
  }

  function handleCancel() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  const titleCharsNearLimit = title.length >= 160;

  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-8 py-8">
      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md mb-6 text-sm"
        >
          {serverError}
        </div>
      )}

      <form
        aria-label={mode === 'create' ? 'Create article' : 'Edit article'}
        aria-busy={isPending}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Title */}
        <div>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title"
            maxLength={200}
            required
            error={errors.title}
            disabled={isPending}
            data-testid="article-title-input"
          />
          {titleCharsNearLimit && !errors.title && (
            <p id="title-counter" className="text-sm text-neutral-500 mt-1">
              {title.length}/200
            </p>
          )}
        </div>

        {/* Slug display (edit mode only) */}
        {mode === 'edit' && initialData && (
          <p className="text-sm text-neutral-500">Slug: {initialData.slug}</p>
        )}

        {/* Category + Status row */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Category select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-select" className="text-sm font-medium text-neutral-700">
              Category
            </label>
            <select
              id="category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPending}
              data-testid="article-category-select"
            className={clsx(
                'h-10 px-3 text-sm rounded-md border bg-white text-neutral-900',
                'focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/20',
                'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed',
                'border-neutral-300',
              )}
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Status</span>
            <StatusToggle value={status} onChange={setStatus} disabled={isPending} />
          </div>
        </div>

        {/* Markdown editor */}
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1.5">Content</label>
          <MarkdownEditor value={content} onChange={setContent} error={errors.content} />
          {errors.content && (
            <p id="content-error" className="text-sm text-red-600 mt-1" role="alert">
              {errors.content}
            </p>
          )}
        </div>

        {/* Button row */}
        <div className="flex items-center gap-3 pt-2">
          {/* Left side: Delete button (edit mode only) */}
          {mode === 'edit' && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isPending}
              data-testid="article-delete-button"
            >
              Delete...
            </Button>
          )}

          {/* Right side spacer */}
          <div className="flex-1" />

          {/* Cancel */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>

          {/* Create mode: Save as Draft + Publish */}
          {mode === 'create' && (
            <>
              <Button
                type="button"
                variant="secondary"
                loading={isPending}
                onClick={() => handleSubmit('draft')}
                data-testid="article-save-draft-button"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={isPending}
                onClick={() => handleSubmit('published')}
                data-testid="article-publish-button"
              >
                Publish
              </Button>
            </>
          )}

          {/* Edit mode: Save */}
          {mode === 'edit' && (
            <Button type="submit" variant="primary" loading={isPending} data-testid="article-save-button">
              Save
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ArticleForm;
