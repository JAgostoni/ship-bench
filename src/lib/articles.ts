import prisma from '@/lib/prisma';
import { articleSchema } from '@/lib/validation';

export async function getArticles() {
  return prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tags: true },
  });
}

export async function getArticle(id: string) {
  return prisma.article.findUnique({ where: { id }, include: { tags: true } });
}

export async function createArticle(data: any) {
  const parsed = articleSchema.parse(data);
  const { tags = [], ...rest } = parsed;
  const dataPayload: any = { ...rest };
  if (tags.length) {
    dataPayload.tags = {
      connectOrCreate: tags.map(name => ({
        where: { name },
        create: { name },
      })),
    };
  }
  return prisma.article.create({ data: dataPayload });
}

export async function updateArticle(id: string, data: any) {
  const parsed = articleSchema.parse(data);
  const { tags = [], ...rest } = parsed;
  return prisma.article.update({
    where: { id },
    data: {
      ...rest,
      tags: {
        set: [], // clear existing relations
        connectOrCreate: tags.map(name => ({
          where: { name },
          create: { name },
        })),
      },
    },
  });
}
