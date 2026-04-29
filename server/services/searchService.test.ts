import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { resetTestDb, createTestPrisma } from '../lib/test-db';
import type { PrismaClient } from '@prisma/client';
import { createArticle } from './articleService';
import { searchArticles } from './searchService';

describe('searchService', () => {
  let prisma: PrismaClient;
  const dbSuffix = 'searchService';

  beforeAll(async () => {
    resetTestDb(dbSuffix);
    prisma = createTestPrisma(dbSuffix);

    // Seed searchable articles
    await createArticle(
      {
        title: 'Onboarding Guide',
        content: 'Welcome to the team onboarding process.',
      },
      prisma
    );
    await createArticle(
      {
        title: 'Remote Work Policy',
        content: 'Our onboarding process includes remote work setup.',
      },
      prisma
    );
    await createArticle(
      {
        title: 'Deployment Runbook',
        content: 'How to deploy services to production safely.',
      },
      prisma
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('searchArticles finds by content', async () => {
    const results = await searchArticles('process', prisma);
    const titles = results.map((r) => r.title);
    expect(titles).toContain('Remote Work Policy');
  });

  test('searchArticles finds by title', async () => {
    const results = await searchArticles('runbook', prisma);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Deployment Runbook');
  });

  test('searchArticles returns empty for no match', async () => {
    const results = await searchArticles('xyznonexistent123', prisma);
    expect(results).toEqual([]);
  });

  test('searchArticles trims and handles empty query', async () => {
    expect(await searchArticles('', prisma)).toEqual([]);
    expect(await searchArticles('   ', prisma)).toEqual([]);
  });

  test('searchArticles includes category and tags', async () => {
    await createArticle(
      {
        title: 'Tagged Result',
        content: 'This article is tagged for search.',
        tagNames: ['searchable'],
      },
      prisma
    );

    const results = await searchArticles('tagged', prisma);
    const found = results.find((r) => r.title === 'Tagged Result');
    expect(found).toBeDefined();
    expect(found?.tags.map((t) => t.name)).toContain('searchable');
  });
});
