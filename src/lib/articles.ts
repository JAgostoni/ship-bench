import { prisma } from './prisma';
import { generateSlug } from './slugify';
import { extractExcerpt } from './excerpt';
import { readingTimeMinutes } from './readingTime';
import { buildColorIndexMap } from './categories';
import type { Article, Category } from '@/generated/prisma/client';
import type { ArticleDTO, ArticleListItem, ArticleStatus } from '@/types';
import type { z } from 'zod';
import type { createArticleSchema, updateArticleSchema } from './schemas';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

type ArticleWithCategory = Article & { category: Category | null };

function toArticleListItem(
  article: ArticleWithCategory,
  colorMap: Map<string, number>,
): ArticleListItem {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: extractExcerpt(article.content),
    status: article.status as ArticleStatus,
    category: article.category
      ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.slug,
          colorIndex: colorMap.get(article.category.id) ?? 0,
          createdAt: article.category.createdAt,
        }
      : null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    readingTimeMinutes: readingTimeMinutes(article.content),
  };
}

function toArticleDTO(
  article: ArticleWithCategory,
  colorMap: Map<string, number>,
): ArticleDTO {
  return {
    ...toArticleListItem(article, colorMap),
    content: article.content,
  };
}

async function getColorMap(): Promise<Map<string, number>> {
  const allCategories = await prisma.category.findMany();
  return buildColorIndexMap(allCategories);
}

export async function listArticles(opts?: {
  categorySlug?: string;
  status?: ArticleStatus;
}): Promise<ArticleListItem[]> {
  const status = opts?.status ?? 'PUBLISHED';

  const articles = await prisma.article.findMany({
    where: {
      status,
      ...(opts?.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    },
    include: { category: true },
    orderBy: { updatedAt: 'desc' },
  });

  const colorMap = await getColorMap();
  return articles.map(a => toArticleListItem(a, colorMap));
}

export async function searchArticles(
  query: string,
  opts?: { categorySlug?: string },
): Promise<ArticleListItem[]> {
  type RawRow = { id: string };

  let rawRows: RawRow[];
  if (opts?.categorySlug) {
    rawRows = await prisma.$queryRaw<RawRow[]>`
      SELECT a.id
      FROM "Article" a
      JOIN "Category" c ON a."categoryId" = c.id
      WHERE a.status = 'PUBLISHED'
        AND c.slug = ${opts.categorySlug}
        AND to_tsvector('english', a.title || ' ' || a.content)
            @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(
        to_tsvector('english', a.title || ' ' || a.content),
        plainto_tsquery('english', ${query})
      ) DESC
      LIMIT 50
    `;
  } else {
    rawRows = await prisma.$queryRaw<RawRow[]>`
      SELECT id
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', title || ' ' || content)
            @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', ${query})
      ) DESC
      LIMIT 50
    `;
  }

  if (rawRows.length === 0) return [];

  const ids = rawRows.map(r => r.id);
  const articles = await prisma.article.findMany({
    where: { id: { in: ids } },
    include: { category: true },
  });

  const colorMap = await getColorMap();
  const articleMap = new Map(articles.map(a => [a.id, a]));

  return ids
    .map(id => articleMap.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map(a => toArticleListItem(a, colorMap));
}

export async function getArticleBySlug(slug: string): Promise<ArticleDTO | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!article) return null;
  const colorMap = await getColorMap();
  return toArticleDTO(article, colorMap);
}

export async function getArticleById(id: string): Promise<ArticleDTO | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!article) return null;
  const colorMap = await getColorMap();
  return toArticleDTO(article, colorMap);
}

export async function createArticle(
  data: z.infer<typeof createArticleSchema>,
): Promise<ArticleDTO> {
  const slug = await generateSlug(data.title, prisma);
  const article = await prisma.article.create({
    data: {
      title: data.title,
      slug,
      content: data.content,
      status: data.status ?? 'PUBLISHED',
      categoryId: data.categoryId ?? null,
    },
    include: { category: true },
  });
  const colorMap = await getColorMap();
  return toArticleDTO(article, colorMap);
}

export async function updateArticle(
  id: string,
  data: z.infer<typeof updateArticleSchema>,
): Promise<ArticleDTO> {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Article ${id} not found`);

  let slug = existing.slug;
  if (data.title && data.title !== existing.title) {
    slug = await generateSlug(data.title, prisma, id);
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title, slug }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    include: { category: true },
  });

  const colorMap = await getColorMap();
  return toArticleDTO(article, colorMap);
}

export async function deleteArticle(id: string): Promise<void> {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Article ${id} not found`);
  await prisma.article.delete({ where: { id } });
}
