import { prisma } from '@/lib/prisma';
import { searchArticles } from '@/lib/search';
import { ArticleList } from '@/components/articles/article-list';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { SearchX } from 'lucide-react';

const ARTICLES_PER_PAGE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const query = params.q?.trim() ?? null;

  let serializedArticles: Array<{
    title: string;
    slug: string;
    excerpt: string | null;
    category: { id: number; name: string; slug: string } | null;
    status: string;
    updatedAt: string;
    createdAt: string;
  }>;
  let totalCount: number;

  if (query) {
    // Search mode
    const search = await searchArticles(query, page, ARTICLES_PER_PAGE);
    totalCount = search.total;
    serializedArticles = search.articles
      .filter((a) => a.status === 'published') // Draft articles excluded from search results
      .map((a) => ({
        ...a,
        updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : a.updatedAt.toISOString(),
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : a.createdAt.toISOString(),
      }));
  } else {
    // Default: show all published articles
    const [articles, count] = await Promise.all([
      prisma.article.findMany({
        where: { status: 'published' },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * ARTICLES_PER_PAGE,
        take: ARTICLES_PER_PAGE,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.article.count({ where: { status: 'published' } }),
    ]);
    totalCount = count;
    serializedArticles = articles.map((a) => ({
      ...a,
      updatedAt: a.updatedAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }));
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ARTICLES_PER_PAGE));

  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8 py-8">
      {/* Search info banner */}
      {query && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-md mb-6 flex items-center justify-between">
          <span className="text-sm">
            Results for &ldquo;{query}&rdquo; — {totalCount} article{totalCount !== 1 ? 's' : ''} found
          </span>
          <Link
            href="/"
            className="text-sm font-medium text-blue-700 hover:text-blue-900 underline flex-shrink-0 ml-4"
          >
            Clear search
          </Link>
        </div>
      )}

      <ArticleList
        articles={serializedArticles}
        emptyStateProps={
          query
            ? {
                icon: SearchX,
                title: `No results for "${query}"`,
                description: 'Try a different search term or browse all articles.',
                action: { label: 'Browse all articles', href: '/' },
              }
            : {
                title: 'No articles yet',
                description: 'Create your first article to get started.',
                action: { label: 'Create article', href: '/articles/new' },
              }
        }
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        baseUrl="/"
        searchParams={query ? { q: query } : undefined}
      />
    </div>
  );
}
