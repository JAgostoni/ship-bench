import { describe, expect, it } from 'vitest';
import { createInsertSchema } from 'drizzle-zod';
import { articles, ARTICLE_STATUSES } from '@/server/db/schema';
import {
  ARTICLE_STATUSES as SCHEMA_ARTICLE_STATUSES,
  EDITABLE_STATUSES,
  articleCreateSchema,
  articleUpdateSchema,
} from './article';

const VALID = { title: 'Deploying the API', bodyMd: '## Prerequisites\n\n- Node 24 LTS\n' };

type SafeParseResult = {
  success: boolean;
  error?: { issues: { path: readonly unknown[]; message: string }[] };
};

/** Returns the message reported for `path`, or undefined when the parse passed. */
function messageFor(result: SafeParseResult, path: string) {
  if (result.success || !result.error) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

/** Returns the first message reported anywhere, or undefined when the parse passed. */
function firstMessage(result: SafeParseResult) {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

describe('articleCreateSchema', () => {
  it('accepts the minimum valid payload and applies defaults', () => {
    const parsed = articleCreateSchema.parse(VALID);
    expect(parsed.title).toBe('Deploying the API');
    expect(parsed.status).toBe('draft');
    expect(parsed.categoryId).toBeNull();
    expect(parsed.summary).toBeUndefined();
  });

  it('trims the title and summary', () => {
    const parsed = articleCreateSchema.parse({ ...VALID, title: '  Spaced  ', summary: '  x  ' });
    expect(parsed.title).toBe('Spaced');
    expect(parsed.summary).toBe('x');
  });

  it('normalizes an empty summary to undefined', () => {
    expect(articleCreateSchema.parse({ ...VALID, summary: '' }).summary).toBeUndefined();
    expect(articleCreateSchema.parse({ ...VALID, summary: '   ' }).summary).toBeUndefined();
  });

  it('coerces categoryId from a string and accepts null', () => {
    expect(articleCreateSchema.parse({ ...VALID, categoryId: '3' }).categoryId).toBe(3);
    expect(articleCreateSchema.parse({ ...VALID, categoryId: null }).categoryId).toBeNull();
    expect(articleCreateSchema.parse(VALID).categoryId).toBeNull();
  });

  it('rejects a 2-character title with the exact message', () => {
    const result = articleCreateSchema.safeParse({ ...VALID, title: 'ab' });
    expect(result.success).toBe(false);
    expect(messageFor(result, 'title')).toBe('Title must be at least 3 characters.');
  });

  it('rejects a 201-character title with the exact message', () => {
    const result = articleCreateSchema.safeParse({ ...VALID, title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
    expect(messageFor(result, 'title')).toBe('Title must be 200 characters or fewer.');
  });

  it('accepts a 200-character title', () => {
    expect(articleCreateSchema.safeParse({ ...VALID, title: 'a'.repeat(200) }).success).toBe(true);
  });

  it('rejects a 301-character summary with the exact message', () => {
    const result = articleCreateSchema.safeParse({ ...VALID, summary: 'a'.repeat(301) });
    expect(result.success).toBe(false);
    expect(messageFor(result, 'summary')).toBe('Summary must be 300 characters or fewer.');
  });

  it('rejects an empty body with the exact message', () => {
    const result = articleCreateSchema.safeParse({ ...VALID, bodyMd: '' });
    expect(result.success).toBe(false);
    expect(messageFor(result, 'bodyMd')).toBe('Article body cannot be empty.');
  });

  it('rejects a 200,001-character body', () => {
    const result = articleCreateSchema.safeParse({ ...VALID, bodyMd: 'a'.repeat(200_001) });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Article body is too large (200,000 character limit).');
  });

  it('accepts a 200,000-character body', () => {
    expect(articleCreateSchema.safeParse({ ...VALID, bodyMd: 'a'.repeat(200_000) }).success).toBe(
      true,
    );
  });

  it('rejects an archived status because only drafts and published are editable', () => {
    expect(articleCreateSchema.safeParse({ ...VALID, status: 'archived' }).success).toBe(false);
  });

  it('exposes the documented status constants', () => {
    expect(SCHEMA_ARTICLE_STATUSES).toEqual(['draft', 'published', 'archived']);
    expect(EDITABLE_STATUSES).toEqual(['draft', 'published']);
    // The editable set is a strict subset of the table's enum.
    expect(ARTICLE_STATUSES).toEqual(expect.arrayContaining([...SCHEMA_ARTICLE_STATUSES]));
  });
});

describe('articleUpdateSchema', () => {
  it('requires a non-negative integer version', () => {
    expect(articleUpdateSchema.safeParse({ ...VALID, version: 4 }).success).toBe(true);
    expect(articleUpdateSchema.safeParse({ ...VALID, version: '4' }).success).toBe(true);
    expect(articleUpdateSchema.safeParse(VALID).success).toBe(false);
    expect(articleUpdateSchema.safeParse({ ...VALID, version: -1 }).success).toBe(false);
    expect(articleUpdateSchema.safeParse({ ...VALID, version: 4.5 }).success).toBe(false);
  });

  it('accepts an optional change note', () => {
    expect(
      articleUpdateSchema.parse({ ...VALID, version: 4, changeNote: '  Fixed  ' }).changeNote,
    ).toBe('Fixed');
    expect(articleUpdateSchema.parse({ ...VALID, version: 4 }).changeNote).toBeUndefined();
  });

  it('rejects a 201-character change note', () => {
    expect(
      articleUpdateSchema.safeParse({ ...VALID, version: 4, changeNote: 'a'.repeat(201) }).success,
    ).toBe(false);
  });

  it('inherits every create rule', () => {
    const result = articleUpdateSchema.safeParse({ ...VALID, title: 'ab', version: 1 });
    expect(result.success).toBe(false);
    expect(messageFor(result, 'title')).toBe('Title must be at least 3 characters.');
  });
});

// Drift guard required by architecture.md §7.4: the hand-authored schema and the
// Drizzle table must agree on the fields they share.
describe('drizzle-zod cross-check', () => {
  const insertSchema = createInsertSchema(articles);
  const sharedPayloads = [
    { title: 'Deploying the API', bodyMd: 'Body text.', status: 'draft' },
    {
      title: 'Deploying the API',
      bodyMd: 'Body text.',
      summary: 'A short summary.',
      status: 'draft',
    },
    { title: 'Deploying the API', bodyMd: 'Body text.', categoryId: 3, status: 'published' },
    { title: 'Deploying the API', bodyMd: 'Body text.', categoryId: null, status: 'draft' },
  ] as const;

  it('covers the same user-authored fields', () => {
    const insertKeys = Object.keys(insertSchema.shape);
    for (const key of Object.keys(articleCreateSchema.shape)) {
      expect(insertKeys).toContain(key);
    }
  });

  it('accepts every payload articleCreateSchema accepts', () => {
    for (const payload of sharedPayloads) {
      const ours = articleCreateSchema.safeParse(payload);
      expect(ours.success).toBe(true);
      const theirs = insertSchema.safeParse({ ...payload, slug: 'deploying-the-api' });
      expect(theirs.success).toBe(true);
    }
  });

  it('agrees on the parsed value of every shared field', () => {
    for (const payload of sharedPayloads) {
      const ours = articleCreateSchema.parse(payload);
      const theirs = insertSchema.parse({ ...payload, slug: 'deploying-the-api' });
      expect(theirs.title).toBe(ours.title);
      expect(theirs.bodyMd).toBe(ours.bodyMd);
      expect(theirs.summary ?? undefined).toBe(ours.summary);
      expect(theirs.categoryId ?? null).toBe(ours.categoryId);
      expect(theirs.status).toBe(ours.status);
    }
  });

  it('agrees on accepting a null categoryId', () => {
    const payload = {
      title: 'Deploying the API',
      bodyMd: 'Body text.',
      slug: 's',
      categoryId: null,
    };
    expect(insertSchema.safeParse(payload).success).toBe(true);
    expect(articleCreateSchema.parse({ ...payload, categoryId: null }).categoryId).toBeNull();
  });

  it('carries a version column defaulted to 1, as the update schema assumes', () => {
    expect(insertSchema.shape).toHaveProperty('version');
    const inserted = insertSchema.parse({ title: 'Deploying the API', bodyMd: 'Body.', slug: 's' });
    expect(inserted.version ?? 1).toBe(1);
  });

  it('lets articleCreateSchema reject what drizzle-zod alone cannot', () => {
    // drizzle-zod derives types only, so it has no opinion on the user-facing
    // minimum length. This is exactly why the schemas are hand-authored.
    expect(insertSchema.safeParse({ title: 'ab', bodyMd: 'x', slug: 's' }).success).toBe(true);
    expect(articleCreateSchema.safeParse({ title: 'ab', bodyMd: 'x' }).success).toBe(false);
  });
});
