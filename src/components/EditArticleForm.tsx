'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trash2 } from 'lucide-react';
import slugifyLib from 'slugify';
import { updateArticleAction, deleteArticleAction } from '@/actions/article';
import { ArticleEditor } from '@/components/ArticleEditor';
import type { ArticleDTO, CategoryDTO } from '@/types';

interface EditArticleFormProps {
  article: ArticleDTO;
  categories: CategoryDTO[];
}

export function EditArticleForm({ article, categories }: EditArticleFormProps) {
  const boundUpdateAction = updateArticleAction.bind(null, article.id);
  const [state, formAction, isPending] = useActionState(boundUpdateAction, {});
  const [slugPreview, setSlugPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const title = e.target.value.trim();
    if (title && title !== article.title) {
      setSlugPreview(slugifyLib(title, { lower: true, strict: true }));
    } else {
      setSlugPreview(null);
    }
  }

  const boundDeleteAction = deleteArticleAction.bind(null, article.id);

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/articles/${article.slug}`}
        className="flex items-center gap-1 text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronLeft size={16} />
        Articles
      </Link>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Edit Article
      </h2>
      <hr className="mb-6" style={{ borderColor: 'var(--color-border)' }} />

      {state.errors?._form && (
        <p role="alert" className="text-sm mb-4 p-3 rounded" style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error-bg)' }}>
          {state.errors._form[0]}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-5">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={200}
            defaultValue={article.title}
            onBlur={handleTitleBlur}
            className="w-full px-3 py-2 rounded border text-sm"
            style={{
              borderColor: state.errors?.title ? 'var(--color-error)' : 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          />
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {slugPreview
              ? `URL will change to: /articles/${slugPreview}`
              : `URL: /articles/${article.slug}`}
          </p>
          {state.errors?.title && (
            <p role="alert" className="text-[13px] mt-1" style={{ color: 'var(--color-error)' }}>
              {state.errors.title[0]}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={article.category?.id ?? ''}
            className="px-3 py-2 rounded border text-sm w-full md:w-60"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <fieldset>
          <legend className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Status
          </legend>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="radio"
                name="status"
                value="PUBLISHED"
                defaultChecked={article.status === 'PUBLISHED'}
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="radio"
                name="status"
                value="DRAFT"
                defaultChecked={article.status === 'DRAFT'}
              />
              Draft
            </label>
          </div>
        </fieldset>

        {/* Content */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Content *
          </label>
          <ArticleEditor
            name="content"
            defaultValue={article.content}
            error={state.errors?.content?.[0]}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/articles/${article.slug}`}
            className="px-4 py-2 text-sm rounded border"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
              backgroundColor: 'transparent',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Delete section */}
      <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={15} />
            Delete
          </button>
        ) : (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            <span style={{ color: 'var(--color-text-primary)' }}>Delete this article?</span>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <form action={boundDeleteAction}>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium rounded text-white"
                style={{ backgroundColor: 'var(--color-error)' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-error)')}
              >
                Yes, delete
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
