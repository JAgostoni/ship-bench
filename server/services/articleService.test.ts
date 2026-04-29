import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { resetTestDb, createTestPrisma } from '../lib/test-db';
import type { PrismaClient } from '@prisma/client';
import {
  listArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from './articleService';

describe('articleService', () => {
  let prisma: PrismaClient;
  let categoryId: number;
  const dbSuffix = 'articleService';

  beforeAll(async () => {
    resetTestDb(dbSuffix);
    prisma = createTestPrisma(dbSuffix);

    // Seed a category for tests
    const cat = await prisma.category.create({
      data: { name: 'Test Category', description: 'For tests' },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('createArticle generates slug and excerpt', async () => {
    const article = await createArticle(
      {
        title: 'Test Article',
        content: '# Heading\n\nThis is the body.',
        categoryId,
      },
      prisma
    );

    expect(article.slug).toBe('test-article');
    expect(article.excerpt).toBe('Heading\n\nThis is the body.'.slice(0, 160).trim());
    expect(article.category?.name).toBe('Test Category');
  });

  test('createArticle connects tags', async () => {
    const article = await createArticle(
      {
        title: 'Tagged Article',
        content: 'Content here',
        tagNames: ['alpha', 'beta'],
      },
      prisma
    );

    expect(article.tags.map((t) => t.name).sort()).toEqual(['alpha', 'beta']);
  });

  test('createArticle handles slug collisions', async () => {
    const a1 = await createArticle({ title: 'Collision Test', content: 'c1' }, prisma);
    const a2 = await createArticle({ title: 'Collision Test', content: 'c2' }, prisma);

    expect(a1.slug).toBe('collision-test');
    expect(a2.slug).toBe('collision-test-2');
  });

  test('listArticles returns paginated results', async () => {
    await createArticle({ title: 'List A', content: 'a' }, prisma);
    await createArticle({ title: 'List B', content: 'b' }, prisma);

    const result = await listArticles({ page: 1, limit: 2 }, prisma);
    expect(result.articles.length).toBeLessThanOrEqual(2);
    expect(result.totalPages).toBeGreaterThanOrEqual(1);
  });

  test('getArticleBySlug returns article or null', async () => {
    const created = await createArticle({ title: 'Find Me', content: 'x' }, prisma);
    const found = await getArticleBySlug(created.slug, prisma);
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Find Me');

    const notFound = await getArticleBySlug('nonexistent-slug', prisma);
    expect(notFound).toBeNull();
  });

  test('updateArticle updates fields and reconnects tags', async () => {
    const created = await createArticle(
      {
        title: 'Updatable',
        content: 'Original content',
        tagNames: ['old'],
      },
      prisma
    );

    const updated = await updateArticle(
      created.slug,
      {
        title: 'Updatable New Title',
        content: 'Updated content',
        tagNames: ['new'],
      },
      prisma
    );

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updatable New Title');
    expect(updated?.content).toBe('Updated content');
    expect(updated?.tags.map((t) => t.name)).toEqual(['new']);

    // Slug should remain immutable
    expect(updated?.slug).toBe(created.slug);
  });

  test('updateArticle returns null for missing slug', async () => {
    const result = await updateArticle('missing-slug', { title: 'Nothing' }, prisma);
    expect(result).toBeNull();
  });

  test('deleteArticle removes article', async () => {
    const created = await createArticle({ title: 'Delete Me', content: 'x' }, prisma);
    const removed = await deleteArticle(created.slug, prisma);
    expect(removed).toBe(true);

    const notFound = await getArticleBySlug(created.slug, prisma);
    expect(notFound).toBeNull();
  });

  test('deleteArticle returns false for missing slug', async () => {
    const result = await deleteArticle('missing-slug', prisma);
    expect(result).toBe(false);
  });
});
