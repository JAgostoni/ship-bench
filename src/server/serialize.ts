import type { ArticleDetail, ArticleListItem, CategorySummary, SearchHit } from '@/types/domain';

/**
 * Wire serializers for the read-only JSON API (`architecture.md` §7.3).
 *
 * **Why explicit functions rather than `JSON.stringify`.** `Date` serializes to an
 * ISO string automatically, but the shape is a contract: §7.3 lists exactly which
 * members each object carries, and the repository types carry *more* than the
 * wire needs (`excerpt` on a search hit would be a second copy of the snippet). A
 * hand-written projection is what makes the response match the documented example
 * member-for-member, and it is also the place a future field addition is forced to
 * be deliberate.
 */

/** The `GET /api/articles` item shape. */
export function toArticleWire(article: ArticleListItem) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    excerpt: article.excerpt,
    status: article.status,
    category: article.category,
    version: article.version,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    publishedAt: article.publishedAt?.toISOString() ?? null,
  };
}

/** The `GET /api/articles/:idOrSlug` shape — the same members plus `bodyMd`. */
export function toArticleDetailWire(article: ArticleDetail) {
  return { ...toArticleWire(article), bodyMd: article.bodyMd };
}

/** The `GET /api/search` result shape, including the `rank` and both segment arrays. */
export function toSearchHitWire(hit: SearchHit) {
  return {
    id: hit.id,
    slug: hit.slug,
    title: hit.title,
    status: hit.status,
    category: hit.category,
    updatedAt: hit.updatedAt.toISOString(),
    rank: hit.rank,
    titleSegments: hit.titleSegments,
    snippetSegments: hit.snippetSegments,
  };
}

/** The `GET /api/categories` item shape. */
export function toCategoryWire(category: CategorySummary) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    articleCount: category.articleCount,
  };
}
