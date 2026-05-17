'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import slugifyLib from 'slugify';
import { createArticleAction } from '@/actions/article';
import { ArticleEditor } from '@/components/ArticleEditor';
import type { CategoryDTO } from '@/types';

interface CreateArticleFormProps {
  categories: CategoryDTO[];
}

export function CreateArticleForm({ categories }: CreateArticleFormProps) {
  const [state, formAction, isPending] = useActionState(createArticleAction, {});
  const [slugPreview, setSlugPreview] = useState('');

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const title = e.target.value.trim();
    if (title) {
      setSlugPreview(slugifyLib(title, { lower: true, strict: true }));
    } else {
      setSlugPreview('');
    }
  }

  return (
    <div className="max-w-[720px]">
      <Link
        href="/articles"
        className="flex items-center gap-1 text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ChevronLeft size={16} />
        Articles
      </Link>

      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        New Article
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
            onBlur={handleTitleBlur}
            className="w-full px-3 py-2 rounded border text-sm"
            style={{
              borderColor: state.errors?.title ? 'var(--color-error)' : 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          />
          {slugPreview && (
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              URL: /articles/{slugPreview}
            </p>
          )}
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
              <input type="radio" name="status" value="PUBLISHED" defaultChecked />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm min-h-[44px] cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input type="radio" name="status" value="DRAFT" />
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
          <ArticleEditor name="content" error={state.errors?.content?.[0]} />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/articles"
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
            className="h-11 md:h-10 px-4 text-sm font-medium rounded-md disabled:opacity-50 transition-colors duration-100"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            {isPending ? 'Creating…' : 'Create Article →'}
          </button>
        </div>
      </form>
    </div>
  );
}
