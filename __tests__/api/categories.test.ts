import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCategoryFindMany } = vi.hoisted(() => ({
  mockCategoryFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: mockCategoryFindMany,
    },
  },
}));

import { GET } from '@/app/api/categories/route';

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all categories with article counts', async () => {
    mockCategoryFindMany.mockResolvedValue([
      {
        id: 1,
        name: 'Guides',
        slug: 'guides',
        description: 'Guide articles',
        _count: { articles: 3 },
      },
      {
        id: 2,
        name: 'Reference',
        slug: 'reference',
        description: null,
        _count: { articles: 1 },
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].name).toBe('Guides');
    expect(data.categories[0]._count.articles).toBe(3);
  });

  it('returns empty array when no categories exist', async () => {
    mockCategoryFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.categories).toHaveLength(0);
  });
});