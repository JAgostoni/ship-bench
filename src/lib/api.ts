import type { ApiResponse } from '@shared/schemas';

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || json.error) {
    const err = json.error ?? { code: 'UNKNOWN', message: 'An unexpected error occurred' };
    throw new ApiError(err.code, err.message, err.details);
  }

  return json.data as T;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  categoryId: number | null;
  category: { id: number; name: string; description: string } | null;
  tags: { id: number; name: string }[];
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryWithCount {
  id: number;
  name: string;
  description: string;
  articleCount: number;
}

export function getArticles(search?: string, page = 1, limit = 10): Promise<PaginatedArticles> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return api<PaginatedArticles>(`/api/articles?${params.toString()}`);
}

export function getArticle(slug: string): Promise<Article> {
  return api<Article>(`/api/articles/${encodeURIComponent(slug)}`);
}

export function searchArticles(query: string): Promise<Article[]> {
  const params = new URLSearchParams({ q: query });
  return api<Article[]>(`/api/search?${params.toString()}`);
}

export function getCategories(): Promise<CategoryWithCount[]> {
  return api<CategoryWithCount[]>('/api/categories');
}

export function createArticle(data: {
  title: string;
  content: string;
  categoryId?: number | null;
  tagNames?: string[];
}): Promise<Article> {
  return api<Article>('/api/articles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateArticle(
  slug: string,
  data: {
    title?: string;
    content?: string;
    categoryId?: number | null;
    tagNames?: string[];
  }
): Promise<Article> {
  return api<Article>(`/api/articles/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteArticle(slug: string): Promise<void> {
  return api<void>(`/api/articles/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
}
