import { describe, expect, it } from 'vitest';
import { AppError, toProblemJson, type AppErrorCode } from './errors';

const STATUSES: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  SLUG_TAKEN: 409,
  CATEGORY_IN_USE: 409,
  DB_UNAVAILABLE: 503,
  INTERNAL: 500,
};

describe('AppError', () => {
  it('carries code, message, details and a stable name', () => {
    const error = new AppError('NOT_FOUND', 'Article not found.', { errors: [] });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Article not found.');
    expect(error.details).toEqual({ errors: [] });
  });

  it('details are optional', () => {
    expect(new AppError('INTERNAL', 'Boom.').details).toBeUndefined();
  });
});

describe('toProblemJson', () => {
  it.each(Object.entries(STATUSES))('maps %s to HTTP %i', (code, status) => {
    const problem = toProblemJson(new AppError(code as AppErrorCode, 'detail.'), '/api/articles');
    expect(problem.status).toBe(status);
    expect(problem.detail).toBe('detail.');
    expect(problem.instance).toBe('/api/articles');
  });

  it('always carries type, title, status, detail and instance', () => {
    const problem = toProblemJson(new AppError('INTERNAL', 'Boom.'), '/api/articles/12');
    expect(Object.keys(problem).sort()).toEqual(
      ['detail', 'instance', 'status', 'title', 'type'].sort(),
    );
  });

  it.each([
    ['NOT_FOUND', 'https://kb.local/problems/not-found'],
    ['VALIDATION_FAILED', 'https://kb.local/problems/validation-failed'],
    ['CONFLICT', 'https://kb.local/problems/conflict'],
    ['SLUG_TAKEN', 'https://kb.local/problems/slug-taken'],
    ['CATEGORY_IN_USE', 'https://kb.local/problems/category-in-use'],
    ['DB_UNAVAILABLE', 'https://kb.local/problems/db-unavailable'],
    ['INTERNAL', 'https://kb.local/problems/internal'],
  ] as const)('builds the %s type URL from the kb.local/problems/* pattern', (code, type) => {
    const problem = toProblemJson(new AppError(code, 'detail.'), '/api/articles');
    expect(problem.type).toBe(type);
  });

  it('NOT_FOUND maps to 404 with a human title', () => {
    const problem = toProblemJson(
      new AppError('NOT_FOUND', 'No article with slug "nope".'),
      '/api/articles/nope',
    );
    expect(problem.status).toBe(404);
    expect(problem.title).toBe('Not found');
  });

  it('CONFLICT maps to 409 and preserves the version error shape', () => {
    const problem = toProblemJson(
      new AppError('CONFLICT', 'Someone saved a newer version of this article.', {
        errors: [{ path: 'version', message: 'Expected version 4, found 5.' }],
      }),
      '/api/articles/12',
    );
    expect(problem.status).toBe(409);
    expect(problem.title).toBe('This article changed since you opened it');
    expect(problem.errors).toEqual([{ path: 'version', message: 'Expected version 4, found 5.' }]);
  });

  it('VALIDATION_FAILED maps to 422 with field-level errors', () => {
    const problem = toProblemJson(
      new AppError('VALIDATION_FAILED', 'The request body failed validation.', {
        errors: [
          { path: 'title', message: 'Title must be at least 3 characters.' },
          { path: 'summary', message: 'Summary must be 300 characters or fewer.' },
        ],
      }),
      '/api/articles',
    );
    expect(problem.status).toBe(422);
    expect(problem.title).toBe('Validation failed');
    expect(problem.errors).toHaveLength(2);
  });

  it('omits the errors member when there are no details', () => {
    const problem = toProblemJson(
      new AppError('DB_UNAVAILABLE', 'Database unreachable.'),
      '/api/health',
    );
    expect(problem).not.toHaveProperty('errors');
  });
});
