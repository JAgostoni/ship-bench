import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateUniqueSlug } from '../lib/slugify';
import type { ArticleCreateInput, ArticleUpdateInput } from '@shared/schemas';

export interface ListArticlesOptions {
  page?: number;
  limit?: number;
}

function makeExcerpt(content: string): string {
  return content.replace(/#+\s/g, '').slice(0, 160).trim();
}

export async function listArticles(
  options: ListArticlesOptions = {},
  db: PrismaClient = prisma
) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, Math.min(100, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const [articles, total] = await Promise.all([
    db.article.findMany({
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: true,
        tags: true,
      },
    }),
    db.article.count(),
  ]);

  return {
    articles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getArticleBySlug(slug: string, db: PrismaClient = prisma) {
  return db.article.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: true,
    },
  });
}

export async function createArticle(data: ArticleCreateInput, db: PrismaClient = prisma) {
  const slug = await generateUniqueSlug(db, data.title);
  const excerpt = makeExcerpt(data.content);

  const tagConnectOrCreates = data.tagNames?.map((name) => ({
    where: { name },
    create: { name },
  }));

  return db.article.create({
    data: {
      slug,
      title: data.title,
      content: data.content,
      excerpt,
      categoryId: data.categoryId ?? null,
      tags: tagConnectOrCreates
        ? { connectOrCreate: tagConnectOrCreates }
        : undefined,
    },
    include: {
      category: true,
      tags: true,
    },
  });
}

export async function updateArticle(
  slug: string,
  data: ArticleUpdateInput,
  db: PrismaClient = prisma
) {
  const existing = await db.article.findUnique({ where: { slug } });
  if (!existing) return null;

  const tagConnectOrCreates = data.tagNames?.map((name) => ({
    where: { name },
    create: { name },
  }));

  return db.article.update({
    where: { slug },
    data: {
      title: data.title,
      content: data.content,
      excerpt: data.content ? makeExcerpt(data.content) : undefined,
      categoryId: data.categoryId === undefined ? undefined : data.categoryId,
      tags: tagConnectOrCreates
        ? {
            set: [],
            connectOrCreate: tagConnectOrCreates,
          }
        : undefined,
    },
    include: {
      category: true,
      tags: true,
    },
  });
}

export async function deleteArticle(slug: string, db: PrismaClient = prisma) {
  const existing = await db.article.findUnique({ where: { slug } });
  if (!existing) return false;

  await db.article.delete({ where: { slug } });
  return true;
}
