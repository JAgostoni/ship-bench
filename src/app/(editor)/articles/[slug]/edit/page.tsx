import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleForm } from '@/components/articles/article-form';
import { EditorShell } from '@/components/layout/editor-shell';
import { articleRepository } from '@/server/repositories/articles';
import { categoryRepository } from '@/server/repositories/categories';

export const dynamic = 'force-dynamic';

type EditParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EditParams): Promise<Metadata> {
  const { slug } = await params;
  const result = articleRepository.getArticleBySlug(slug, 1);
  if (!result.ok) return { title: "We couldn't find that article." };
  return { title: `Edit: ${result.value.article.title}` };
}

/**
 * `/articles/[slug]/edit` — the edit route (design-spec.md §2.2, §3.5).
 *
 * The focused shell plus the form, seeded from the stored article. Three details are
 * spec-mandated rather than incidental:
 *
 * - **The change-note field is present here and absent on create** (E3): a create has
 *   no prior state to describe.
 * - **`version` travels as a hidden field** inside the form (`ArticleForm` renders
 *   it), which is the optimistic-concurrency token the repository checks (§9.4).
 * - **An archived article is only fetched one revision deep** for the metadata call
 *   and then normally for the page; both go through the same repository, so a missing
 *   article is a real `notFound()` rather than an empty form.
 */
export default async function EditArticlePage({ params }: EditParams) {
  const { slug } = await params;
  const result = articleRepository.getArticleBySlug(slug);

  // The route's own `not-found.tsx` renders this, not the generic 404.
  if (!result.ok) notFound();

  const { article } = result.value;
  const categories = categoryRepository.listOptions();

  return (
    <EditorShell title={`Edit: ${article.title}`} formId="article-form" saveLabel="Save changes">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-6">
        <ArticleForm mode="edit" categories={categories} article={article} />
      </div>
    </EditorShell>
  );
}
