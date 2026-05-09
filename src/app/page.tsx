import { prisma } from '@/lib/prisma';
import { ArticleList } from '@/components/articles/article-list';
import { Pagination } from '@/components/ui/pagination';

const ARTICLES_PER_PAGE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const [articles, totalCount] = await Promise.all([
    prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * ARTICLES_PER_PAGE,
      take: ARTICLES_PER_PAGE,
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.article.count({ where: { status: 'published' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ARTICLES_PER_PAGE));

  // Serialize dates for client components
  const serializedArticles = articles.map((a) => ({
    ...a,
    updatedAt: a.updatedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-[var(--content-max-width)] mx-auto px-4 md:px-8 py-8">
      <ArticleList
        articles={serializedArticles}
        emptyStateProps={{
          title: 'No articles yet',
          description: 'Create your first article to get started.',
          action: { label: 'Create article', href: '/articles/new' },
        }}
      />
      <Pagination page={page} totalPages={totalPages} baseUrl="/" />
    </div>
  );
}
