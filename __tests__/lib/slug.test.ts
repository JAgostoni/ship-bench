import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaFindUnique } = vi.hoisted(() => ({
  mockPrismaFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findUnique: mockPrismaFindUnique,
    },
  },
}));

import { generateSlug } from '@/lib/slug';

describe('generateSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts a basic title to slug', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('Getting Started');
    expect(slug).toBe('getting-started');
  });

  it('handles special characters', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug("What's New?");
    expect(slug).toBe('what-s-new');
  });

  it('collapses multiple spaces and hyphens', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('API   Reference!!!');
    expect(slug).toBe('api-reference');
  });

  it('trims leading and trailing special chars', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('---Hello---');
    expect(slug).toBe('hello');
  });

  it('falls back to "untitled" for all-special-char titles', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('!!!');
    expect(slug).toBe('untitled');
  });

  it('appends -2 on uniqueness collision', async () => {
    // First call: slug exists, second call: unique slug available
    mockPrismaFindUnique
      .mockResolvedValueOnce({ slug: 'getting-started' })
      .mockResolvedValueOnce(null);
    const slug = await generateSlug('Getting Started');
    expect(slug).toBe('getting-started-2');
    expect(mockPrismaFindUnique).toHaveBeenCalledTimes(2);
  });

  it('increments suffix when -2 also exists', async () => {
    mockPrismaFindUnique
      .mockResolvedValueOnce({ slug: 'getting-started' })   // base slug exists
      .mockResolvedValueOnce({ slug: 'getting-started-2' })  // -2 exists
      .mockResolvedValueOnce(null);                           // -3 available
    const slug = await generateSlug('Getting Started');
    expect(slug).toBe('getting-started-3');
    expect(mockPrismaFindUnique).toHaveBeenCalledTimes(3);
  });

  it('handles numeric titles', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('2026 Roadmap');
    expect(slug).toBe('2026-roadmap');
  });

  it('handles empty string', async () => {
    mockPrismaFindUnique.mockResolvedValue(null);
    const slug = await generateSlug('');
    expect(slug).toBe('untitled');
  });
});