import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `POST /api/categories` (iteration 6.8).
 *
 * The duplicate case is the interesting one: the contract says `409`, and the reason it
 * is reachable at all is that the repository turns the case-insensitive collision into a
 * `CONFLICT` `AppError` rather than letting a raw SQLite constraint escape — so this test
 * also pins that translation.
 */

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock('@/server/logger', () => ({ logger: { info: () => undefined } }));

const { POST } = await import('./route');
const { createCategoryRepository } = await import('@/server/repositories/categories');
const { createTestDb } = await import('@/test/db');

type TestDb = ReturnType<typeof createTestDb>;

const BASE = 'http://localhost/api/categories';

function jsonRequest(body: unknown, origin = 'http://localhost'): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin, host: 'localhost' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/categories', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
  });

  afterEach(() => {
    handle.close();
  });

  it('creates the category and answers 201 with id/slug/name', async () => {
    const response = await POST(
      jsonRequest({ name: 'Engineering', description: 'Build and ship.' }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(Object.keys(body).sort()).toEqual(['id', 'name', 'slug'].sort());
    expect(body).toMatchObject({ name: 'Engineering', slug: 'engineering' });
  });

  it('returns 409 for a duplicate name, case-insensitively', async () => {
    await POST(jsonRequest({ name: 'Engineering' }));

    const response = await POST(jsonRequest({ name: 'engineering' }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body.type).toBe('https://kb.local/problems/conflict');
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(1);
  });

  it('returns 422 for an invalid body', async () => {
    const response = await POST(jsonRequest({ name: 'x'.repeat(61) }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors).toEqual([
      { path: 'name', message: 'Name must be 60 characters or fewer.' },
    ]);
  });

  it('rejects a cross-origin request with 403', async () => {
    const response = await POST(jsonRequest({ name: 'Engineering' }, 'https://evil.example'));

    expect(response.status).toBe(403);
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(0);
  });

  it('rejects a non-JSON content type with 415', async () => {
    const request = new Request(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'name=Engineering',
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
  });
});
