import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() runs before vi.mock(), allowing variables to be referenced in mock factories
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteArticle: vi.fn(),
  queryRaw: vi.fn(),
  categoryFindMany: vi.fn(),
  generateSlug: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.deleteArticle,
    },
    category: {
      findMany: mocks.categoryFindMany,
    },
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock('@/lib/slugify', () => ({
  generateSlug: mocks.generateSlug,
}));

import {
  listArticles,
  searchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  NotFoundError,
} from '@/lib/articles';
import { generateSlug } from '@/lib/slugify';

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'article-1',
    title: 'Test Article',
    slug: 'test-article',
    content: 'Hello world content.',
    status: 'PUBLISHED',
    categoryId: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.categoryFindMany.mockResolvedValue([]);
  mocks.generateSlug.mockResolvedValue('mocked-slug');
});

describe('listArticles', () => {
  it('calls findMany with status PUBLISHED by default', async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await listArticles();
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
  });

  it('includes category join filter when categorySlug is provided', async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await listArticles({ categorySlug: 'engineering' });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { slug: 'engineering' },
        }),
      }),
    );
  });

  it('maps results to ArticleListItem with excerpt and readingTimeMinutes', async () => {
    mocks.findMany.mockResolvedValueOnce([makeArticle()]);
    const results = await listArticles();
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('excerpt');
    expect(results[0]).toHaveProperty('readingTimeMinutes');
    expect(results[0]).not.toHaveProperty('content');
  });
});

describe('searchArticles', () => {
  it('calls $queryRaw and returns mapped ArticleListItem[]', async () => {
    const article = makeArticle();
    mocks.queryRaw.mockResolvedValueOnce([{ id: article.id }]);
    mocks.findMany.mockResolvedValueOnce([article]);
    const results = await searchArticles('hello');
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('excerpt');
  });

  it('returns empty array when $queryRaw returns no rows', async () => {
    mocks.queryRaw.mockResolvedValueOnce([]);
    const results = await searchArticles('nothing');
    expect(results).toHaveLength(0);
  });
});

describe('createArticle', () => {
  it('calls generateSlug then prisma.article.create', async () => {
    mocks.create.mockResolvedValueOnce(makeArticle({ slug: 'mocked-slug' }));
    await createArticle({ title: 'Test', content: 'Content', status: 'PUBLISHED' });
    expect(generateSlug).toHaveBeenCalledWith('Test', expect.anything());
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('returns ArticleDTO with excerpt and readingTimeMinutes', async () => {
    mocks.create.mockResolvedValueOnce(makeArticle({ slug: 'mocked-slug' }));
    const result = await createArticle({ title: 'Test', content: 'Content', status: 'PUBLISHED' });
    expect(result).toHaveProperty('excerpt');
    expect(result).toHaveProperty('readingTimeMinutes');
    expect(result).toHaveProperty('content');
  });
});

describe('updateArticle', () => {
  it('calls generateSlug with excludeId when title changes', async () => {
    const original = makeArticle({ title: 'Old Title', slug: 'old-title' });
    mocks.findUnique.mockResolvedValueOnce(original);
    mocks.update.mockResolvedValueOnce(makeArticle({ slug: 'mocked-slug', title: 'New Title' }));
    await updateArticle('article-1', { title: 'New Title', content: 'Updated' });
    expect(generateSlug).toHaveBeenCalledWith('New Title', expect.anything(), 'article-1');
  });

  it('calls prisma.article.update', async () => {
    mocks.findUnique.mockResolvedValueOnce(makeArticle());
    mocks.update.mockResolvedValueOnce(makeArticle());
    await updateArticle('article-1', { content: 'New content' });
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when article does not exist', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(updateArticle('nonexistent', { title: 'x' })).rejects.toThrow(NotFoundError);
  });
});

describe('deleteArticle', () => {
  it('calls prisma.article.delete', async () => {
    mocks.findUnique.mockResolvedValueOnce(makeArticle());
    mocks.deleteArticle.mockResolvedValueOnce(undefined);
    await deleteArticle('article-1');
    expect(mocks.deleteArticle).toHaveBeenCalledWith({ where: { id: 'article-1' } });
  });

  it('throws NotFoundError when article does not exist', async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(deleteArticle('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
