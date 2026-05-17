import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from '@kb/db';

// Mock prisma
vi.mock('@kb/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    article: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
  },
}));

describe('API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 and ok status', async () => {
      (prisma.$queryRaw as any).mockResolvedValue([{ 1: 1 }]);
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    });

    it('should return 500 if database is disconnected', async () => {
      (prisma.$queryRaw as any).mockRejectedValue(new Error('DB Error'));
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/articles', () => {
    it('should return a list of articles', async () => {
      const mockArticles = [{ id: '1', title: 'Test', slug: 'test', status: 'PUBLISHED' }];
      (prisma.article.findMany as any).mockResolvedValue(mockArticles);
      (prisma.article.count as any).mockResolvedValue(1);

      const response = await request(app).get('/api/articles');
      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe('POST /api/articles', () => {
    it('should create a new article', async () => {
      const newArticle = { title: 'New Article', content: 'Content', status: 'PUBLISHED' };
      const createdArticle = { ...newArticle, id: 'uuid', slug: 'new-article' };
      
      (prisma.article.findFirst as any).mockResolvedValue(null); // For slug uniqueness check
      (prisma.article.create as any).mockResolvedValue(createdArticle);

      const response = await request(app)
        .post('/api/articles')
        .send(newArticle);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Article');
      expect(response.body.slug).toBe('new-article');
    });

    it('should return 400 for invalid data', async () => {
      const invalidArticle = { content: 'Missing title' };
      const response = await request(app)
        .post('/api/articles')
        .send(invalidArticle);

      expect(response.status).toBe(400);
    });
  });
});
