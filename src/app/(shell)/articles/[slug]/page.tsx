import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { ArticleBody } from '@/components/articles/article-body';
import { ArticleHeader } from '@/components/articles/article-header';
import { BackToTop } from '@/components/articles/back-to-top';
import { RevisionList } from '@/components/articles/revision-list';
import { InlineTableOfContents, TableOfContents } from '@/components/articles/table-of-contents';
import { extractHeadings } from '@/components/articles/toc-headings';
import { Button } from '@/components/ui/button';
import { articleRepository } from '@/server/repositories/articles';

type DetailParams = { params: Promise<{ slug: string }> };

/** design-spec.md §3.4's title-segment truncation, applied to the metadata title. */
export async function generateMetadata({ params }: DetailParams): Promise<Metadata> {
  const { slug } = await params;
  const result = articleRepository.getArticleBySlug(slug);

  if (!result.ok) return { title: "We couldn't find that article." };
  return {
    title: result.value.article.title,
    description: result.value.article.summary ?? undefined,
  };
}

/**
 * The article detail route (`architecture.md` §9.1, design-spec.md §3.4).
 *
 * One repository call returns the article and its 5 most recent revisions in two
 * queries. A `NOT_FOUND` result calls `notFound()` so the segment's own
 * `not-found.tsx` renders — never the generic 404 (design-spec.md §3.4). Archived
 * articles resolve normally, so their links do not rot.
 */
export default async function ArticlePage({ params }: DetailParams) {
  const { slug } = await params;
  const result = articleRepository.getArticleBySlug(slug);

  if (!result.ok) notFound();

  const { article, revisions } = result.value;
  const headings = extractHeadings(article.bodyMd);

  return (
    <>
      <div className="px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-3xl gap-10">
          <article className="min-w-0 flex-1">
            <ArticleHeader article={article} />

            <div className="mt-6">
              <InlineTableOfContents headings={headings} />
              <ArticleBody markdown={article.bodyMd} />
            </div>

            <RevisionList revisions={revisions} />

            <div className="mt-10">
              <Button asChild variant="secondary" size="md">
                <Link href={`/articles/${article.slug}/edit`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit this article
                </Link>
              </Button>
            </div>
          </article>

          {/*
            The TOC column is ≥1280px only (UX17). It is `sticky` and, when the body
            has fewer than two headings, `TableOfContents` returns `null` while the
            column itself keeps the content centered — design-spec.md §3.4's
            "Body renders no headings" state says explicitly not to left-align.
          */}
          <div className="hidden w-(--layout-toc-w) shrink-0 xl:block">
            <div className="sticky top-[calc(var(--layout-header-h)+2rem)]">
              <TableOfContents headings={headings} />
            </div>
          </div>
        </div>
      </div>
      <BackToTop />
    </>
  );
}
