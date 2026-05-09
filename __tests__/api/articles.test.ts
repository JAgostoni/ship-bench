import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and search module at hoist level
const { mockFindMany, mockCount, mockCreate, mockFindUnique, mockUpdate, mockDelete } =
  vi.hoisted(() => ({
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
  }));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
    category: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

const { mockSearchArticles, mockGenerateSlug, mockStripMarkdown } = vi.hoisted(() => ({
  mockSearchArticles: vi.fn(),
  mockGenerateSlug: vi.fn(),
  mockStripMarkdown: vi.fn(),
}));

vi.mock('@/lib/search', () => ({
  searchArticles: mockSearchArticles,
  stripMarkdown: mockStripMarkdown,
}));

vi.mock('@/lib/slug', () => ({
  generateSlug: mockGenerateSlug,
}));

import { GET, POST } from '@/app/api/articles/route';
import { GET as GET_BY_ID, PUT, DELETE } from '@/app/api/articles/[id]/route';

import { NextRequest } from 'next/server';

const BASE = 'http://localhost:3000';

function buildRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): NextRequest {
  return new NextRequest(`${BASE}${url}`, {
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

describe('GET /api/articles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated published articles', async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, title: 'Test', slug: 'test', status: 'published', category: null },
    ]);
    mockCount.mockResolvedValue(1);

    const req = buildRequest('/api/articles');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.articles).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it('filters by category slug', async () => {
    const { prisma } = await import('@/lib/prisma');
    const catFindUnique = prisma.category.findUnique as ReturnType<typeof vi.fn>;
    catFindUnique.mockResolvedValue({ id: 2 });

    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = buildRequest('/api/articles?category=guides');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 2 }),
      }),
    );
  });

  it('delegates to search when q param is present', async () => {
    mockSearchArticles.mockResolvedValue({
      articles: [{ id: 1, title: 'Result', slug: 'result', status: 'published', category: null }],
      total: 1,
    });

    const req = buildRequest('/api/articles?q=searchterm');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.articles).toHaveLength(1);
    expect(mockSearchArticles).toHaveBeenCalledWith('searchterm', 1, 20);
  });

  it('handles pagination parameters', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(100);

    const req = buildRequest('/api/articles?page=2&limit=10');
    const res = await GET(req);
    const data = await res.json();

    expect(data.page).toBe(2);
    expect(data.totalPages).toBe(10);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });
});

describe('POST /api/articles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an article with valid data and returns 201', async () => {
    mockGenerateSlug.mockResolvedValue('my-article');
    mockStripMarkdown.mockReturnValue('Content excerpt...');
    mockCreate.mockResolvedValue({
      id: 1,
      title: 'My Article',
      slug: 'my-article',
      content: '# Hello',
      excerpt: 'Content excerpt...',
      status: 'published',
      categoryId: null,
      category: null,
    });

    const req = buildRequest('/api/articles', {
      method: 'POST',
      body: {
        title: 'My Article',
        content: '# Hello',
        status: 'published',
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.slug).toBe('my-article');
  });

  it('returns 400 for invalid data', async () => {
    const req = buildRequest('/api/articles', {
      method: 'POST',
      body: { title: '', content: '' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });
});

describe('GET /api/articles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single article by ID', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      title: 'Single',
      slug: 'single',
      status: 'published',
      category: null,
    });

    const req = buildRequest('/api/articles/1');
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: '1' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe('Single');
  });

  it('returns 404 when article not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = buildRequest('/api/articles/9999');
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: '9999' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Article not found');
  });

  it('returns 400 for non-numeric ID', async () => {
    const req = buildRequest('/api/articles/abc');
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: 'abc' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid article ID');
  });
});

describe('PUT /api/articles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an article and returns it', async () => {
    mockUpdate.mockResolvedValue({
      id: 1,
      title: 'Updated',
      slug: 'updated',
      content: 'Updated content',
      status: 'published',
      category: null,
    });
    mockStripMarkdown.mockReturnValue('Updated content');

    const req = buildRequest('/api/articles/1', {
      method: 'PUT',
      body: { title: 'Updated', content: 'Updated content' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe('Updated');
  });

  it('returns 400 on validation error', async () => {
    const req = buildRequest('/api/articles/1', {
      method: 'PUT',
      body: { title: '' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) } as never);

    expect(res.status).toBe(400);
  });

  it('returns 404 when article not found for update', async () => {
    const prismaError = new Error('Record not found') as Error & { code: string };
    prismaError.code = 'P2025';
    mockUpdate.mockRejectedValue(prismaError);

    const req = buildRequest('/api/articles/9999', {
      method: 'PUT',
      body: { title: 'Nope' },
    });
    const res = await PUT(req, { params: Promise.resolve({ id: '9999' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Article not found');
  });
});

describe('DELETE /api/articles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an article and returns 204', async () => {
    mockDelete.mockResolvedValue({ id: 1 });

    const req = buildRequest('/api/articles/1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) } as never);

    expect(res.status).toBe(204);
  });

  it('returns 404 when article to delete is not found', async () => {
    const prismaError = new Error('Record not found') as Error & { code: string };
    prismaError.code = 'P2025';
    mockDelete.mockRejectedValue(prismaError);

    const req = buildRequest('/api/articles/9999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '9999' }) } as never);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Article not found');
  });
});