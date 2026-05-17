import Link from 'next/link';
import { listArticles, searchArticles } from '@/lib/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/EmptyState';

interface ArticlesPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { q, category } = await searchParams;

  const articles = q
    ? await searchArticles(q, { categorySlug: category })
    : await listArticles({ categorySlug: category });

  const isSearching = Boolean(q);
  const isFiltering = Boolean(category) && !isSearching;

  let emptyVariant: 'empty' | 'no-results' | 'no-category' = 'empty';
  if (isSearching) emptyVariant = 'no-results';
  else if (isFiltering) emptyVariant = 'no-category';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isSearching ? `Results for "${q}"` : 'Articles'}
          </h1>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </span>
          {isSearching && (
            <Link
              href="/articles"
              className="text-sm transition-colors duration-100"
              style={{ color: 'var(--color-accent)' }}
            >
              × Clear search
            </Link>
          )}
        </div>
        <Link
          href="/articles/new"
          className="h-11 md:h-10 px-4 inline-flex items-center rounded-md font-medium text-white text-sm transition-colors duration-100 shrink-0
                     hover:bg-[--color-accent-hover]
                     focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          + New Article
        </Link>
      </div>

      <hr className="mb-4" style={{ borderColor: 'var(--color-border)' }} />

      {articles.length === 0 ? (
        <EmptyState variant={emptyVariant} query={q} category={category} />
      ) : (
        <ul className="flex flex-col gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} {...article} />
          ))}
        </ul>
      )}
    </div>
  );
}
