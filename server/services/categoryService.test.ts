import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { resetTestDb, createTestPrisma } from '../lib/test-db';
import type { PrismaClient } from '@prisma/client';
import { listCategories } from './categoryService';
import { createArticle } from './articleService';

describe('categoryService', () => {
  let prisma: PrismaClient;
  const dbSuffix = 'categoryService';

  beforeAll(async () => {
    resetTestDb(dbSuffix);
    prisma = createTestPrisma(dbSuffix);

    // Seed categories directly via Prisma
    await prisma.category.create({ data: { name: 'Alpha', description: 'A' } });
    await prisma.category.create({ data: { name: 'Beta', description: 'B' } });

    const alpha = await prisma.category.findUnique({ where: { name: 'Alpha' } });
    if (alpha) {
      await createArticle({ title: 'Article One', content: 'x', categoryId: alpha.id }, prisma);
      await createArticle({ title: 'Article Two', content: 'y', categoryId: alpha.id }, prisma);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('listCategories returns categories with article counts', async () => {
    const cats = await listCategories(prisma);
    expect(cats.length).toBeGreaterThanOrEqual(2);

    const alpha = cats.find((c) => c.name === 'Alpha');
    expect(alpha).toBeDefined();
    expect(alpha?.articleCount).toBe(2);

    const beta = cats.find((c) => c.name === 'Beta');
    expect(beta).toBeDefined();
    expect(beta?.articleCount).toBe(0);
  });
});
