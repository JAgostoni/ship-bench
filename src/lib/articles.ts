import prisma from '@/lib/prisma';
import { articleSchema } from '@/lib/validation';

export async function getArticles() {
  return prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getArticle(id: string) {
  return prisma.article.findUnique({ where: { id } });
}

export async function createArticle(data: any) {
  const parsed = articleSchema.parse(data);
  return prisma.article.create({ data: parsed });
}

export async function updateArticle(id: string, data: any) {
  const parsed = articleSchema.parse(data);
  return prisma.article.update({ where: { id }, data: parsed });
}
