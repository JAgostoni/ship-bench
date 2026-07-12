import {
  listArticles,
  listCategories,
  listTags,
  parseListStatus,
  parsePageParam,
} from "@/lib/queries/articles";
import { ArticleFilters } from "@/components/articles/ArticleFilters";
import { ArticleList } from "@/components/articles/ArticleList";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    status?: string | string[];
    category?: string | string[];
    tag?: string | string[];
    page?: string | string[];
  }>;
};

function firstParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const status = parseListStatus(params.status);
  const categorySlug = firstParam(params.category);
  const tagSlug = firstParam(params.tag);
  const page = parsePageParam(params.page);

  const [listResult, categories, tags] = await Promise.all([
    listArticles({
      status,
      categorySlug,
      tagSlug,
      page,
      pageSize: 20,
    }),
    listCategories(),
    listTags(),
  ]);

  const hasActiveFilters =
    status !== "PUBLISHED" || Boolean(categorySlug) || Boolean(tagSlug);

  // If page is past last page and there are results, clamp is handled by empty list;
  // still show pagination context from query.
  const { items, total, page: currentPage, totalPages } = listResult;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          Articles
        </h1>
        {total > 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {total} {total === 1 ? "article" : "articles"}
          </p>
        ) : null}
      </header>

      <div className="md:flex md:items-start md:gap-8">
        <ArticleFilters
          status={status}
          categorySlug={categorySlug}
          tagSlug={tagSlug}
          categories={categories}
          tags={tags}
        />

        <div className="min-w-0 flex-1">
          <ArticleList
            items={items}
            total={total}
            page={currentPage}
            totalPages={totalPages}
            hasActiveFilters={hasActiveFilters}
            filters={{
              status,
              category: categorySlug,
              tag: tagSlug,
            }}
          />
        </div>
      </div>
    </div>
  );
}
