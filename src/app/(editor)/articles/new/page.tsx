import type { Metadata } from 'next';
import { ArticleForm } from '@/components/articles/article-form';
import { EditorShell } from '@/components/layout/editor-shell';
import { categoryRepository } from '@/server/repositories/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'New article' };

type NewArticleParams = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/articles/new` — the create route (design-spec.md §2.2, §3.5).
 *
 * The focused shell (no sidebar, no TOC, no search) plus the form. `?category={slug}`
 * pre-selects a category, which is what makes the empty category state's
 * `New article in {category}` call to action land on a form that already knows where
 * the article belongs (design-spec.md §5.6 state 3).
 *
 * The form starts empty — no placeholder body, `status: 'draft'`,
 * `Uncategorized` — per §3.5's "Create, empty" state. Pre-filled placeholder text is
 * explicitly rejected there: an empty editor is less confusing than text the user has
 * to delete first.
 */
export default async function NewArticlePage({ searchParams }: NewArticleParams) {
  const params = await searchParams;
  const requested = typeof params.category === 'string' ? params.category : undefined;

  const categories = categoryRepository.listOptions();
  const initialCategoryId = requested
    ? (categories.find((category) => category.slug === requested)?.id ?? null)
    : null;

  return (
    <EditorShell title="New article" formId="article-form" saveLabel="Save article">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-6">
        <ArticleForm mode="create" categories={categories} initialCategoryId={initialCategoryId} />
      </div>
    </EditorShell>
  );
}
