import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function listCategories(db: PrismaClient = prisma) {
  const categories = await db.category.findMany({
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    articleCount: c._count.articles,
  }));
}
