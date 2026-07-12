import type { ArticleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ListArticlesStatus = ArticleStatus | "ALL";

export type ListArticlesParams = {
  status?: ListArticlesStatus;
  categorySlug?: string;
  tagSlug?: string;
  page?: number;
  pageSize?: number;
};

export type ArticleListItem = Prisma.ArticleGetPayload<{
  include: {
    category: true;
    tags: { include: { tag: true } };
  };
}>;

export type ListArticlesResult = {
  items: ArticleListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 20;

/**
 * Normalize status filter from URL or callers.
 * Omitted / empty / invalid → PUBLISHED (list default).
 */
export function parseListStatus(
  raw: string | string[] | undefined,
): ListArticlesStatus {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === "PUBLISHED") return "PUBLISHED";
  if (value === "DRAFT") return "DRAFT";
  if (value === "ALL" || value === "all") return "ALL";
  return "PUBLISHED";
}

function parsePositiveInt(
  raw: string | string[] | undefined,
  fallback: number,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function parsePageParam(
  raw: string | string[] | undefined,
): number {
  return parsePositiveInt(raw, 1);
}

/**
 * List articles with filters, pagination, and relations.
 * Default status is PUBLISHED when omitted.
 */
export async function listArticles(
  params: ListArticlesParams = {},
): Promise<ListArticlesResult> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100);
  const page = Math.max(params.page ?? 1, 1);
  const status = params.status ?? "PUBLISHED";

  const where: Prisma.ArticleWhereInput = {};

  if (status !== "ALL") {
    where.status = status;
  }

  if (params.categorySlug) {
    where.category = { slug: params.categorySlug };
  }

  if (params.tagSlug) {
    where.tags = {
      some: {
        tag: { slug: params.tagSlug },
      },
    };
  }

  try {
    const [total, items] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error("[queries/articles] listArticles failed:", err);
    throw err;
  }
}

/**
 * Full article by slug with category and tags. Returns null if missing.
 */
export async function getArticleBySlug(
  slug: string,
): Promise<ArticleListItem | null> {
  if (!slug) return null;

  try {
    return await prisma.article.findUnique({
      where: { slug },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });
  } catch (err) {
    console.error("[queries/articles] getArticleBySlug failed:", err);
    throw err;
  }
}

export async function listCategories() {
  try {
    return await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("[queries/articles] listCategories failed:", err);
    throw err;
  }
}

export async function listTags() {
  try {
    return await prisma.tag.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("[queries/articles] listTags failed:", err);
    throw err;
  }
}
