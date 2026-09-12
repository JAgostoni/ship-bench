// The shared error mapper for the read-only JSON API (iteration 5.6).
//
// `architecture.md` §7.3 requires *all* errors from the API to be RFC 9457
// problem+json with the §10.5 status mapping. Three shapes reach a route handler —
// our own `AppError`, Zod's `ZodError`, and an unexpected throw — and the third is
// the one the brief's "no silent failures" rule is really about: it must produce a
// 500 with a problem document, never a leaked stack trace and never a 200.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { badRequestResponse, notFoundResponse, problemResponse } from './http';

const REQUEST = new Request('http://localhost/api/articles?page=2');

describe('problemResponse', () => {
  it('maps an AppError to its §10.5 status with application/problem+json', async () => {
    const response = problemResponse(new AppError('NOT_FOUND', 'No such article.'), REQUEST);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body).toMatchObject({
      type: 'https://kb.local/problems/not-found',
      status: 404,
      detail: 'No such article.',
      instance: '/api/articles',
    });
  });

  it('preserves field-level errors from an AppError', async () => {
    const response = problemResponse(
      new AppError('VALIDATION_FAILED', 'Bad payload.', {
        errors: [{ path: 'title', message: 'Title must be at least 3 characters.' }],
      }),
      REQUEST,
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.title).toBe('Validation failed');
    expect(body.errors).toEqual([
      { path: 'title', message: 'Title must be at least 3 characters.' },
    ]);
  });

  it('turns a ZodError into 422 with one error entry per issue', async () => {
    const schema = z.object({ title: z.string().min(3), pageSize: z.number().max(50) });
    const parsed = schema.safeParse({ title: 'a', pageSize: 999 });
    if (parsed.success) throw new Error('fixture should not parse');

    const response = problemResponse(parsed.error, REQUEST);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors).toHaveLength(2);
    expect(body.errors[0]).toHaveProperty('path');
    expect(body.errors[0]).toHaveProperty('message');
  });

  it('turns an unexpected throw into 500 without leaking the message or a stack', async () => {
    const response = problemResponse(
      new Error('SQLITE_ERROR: no such table: article_search'),
      REQUEST,
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body.type).toBe('https://kb.local/problems/internal');
    // The driver text must not reach an unauthenticated client.
    expect(JSON.stringify(body)).not.toContain('SQLITE_ERROR');
    expect(JSON.stringify(body)).not.toContain('at ');
  });

  it('handles a non-Error throw', async () => {
    const response = problemResponse('something odd', REQUEST);

    expect(response.status).toBe(500);
  });
});

describe('notFoundResponse', () => {
  it('builds a 404 whose type ends in /not-found, the shape §7.3 documents', async () => {
    const response = notFoundResponse(REQUEST, 'No article with slug "nope".');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toBe('https://kb.local/problems/not-found');
    expect(body.detail).toBe('No article with slug "nope".');
  });
});

describe('badRequestResponse', () => {
  it('builds the documented 400 for a missing search query', async () => {
    const response = badRequestResponse(
      new Request('http://localhost/api/search'),
      'q is required.',
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body).toMatchObject({ status: 400, instance: '/api/search', detail: 'q is required.' });
  });
});
