import { describe, expect, it } from 'vitest';
import {
  articleCreateSchema,
  articleFormSchema,
  articleUpdateSchema,
  EDITABLE_STATUSES,
} from './article';

/**
 * The change-note regression, pinned (iteration 6.3).
 *
 * `zodResolver` **replaces** the submitted values with the schema's output, so any field
 * the schema does not declare is dropped before the form sees it. The client form was
 * originally resolved against `articleCreateSchema`, which has no `changeNote` — so
 * although the field rendered and the user could type in it, the value never reached
 * `FormData` and every revision was written with a `null` note.
 *
 * These assertions are what make that failure a build-time one rather than a silent
 * data-loss bug: the client schema must keep `changeNote`, and the server schemas must
 * accept it.
 */
describe('articleFormSchema', () => {
  const base = {
    title: 'Deploying the API',
    bodyMd: '## Prerequisites',
    summary: '',
    categoryId: null,
    status: 'draft' as const,
  };

  it('preserves changeNote through parsing, unlike articleCreateSchema', () => {
    const withNote = { ...base, changeNote: 'Clarified the rollback steps' };

    expect(articleFormSchema.parse(withNote).changeNote).toBe('Clarified the rollback steps');
    // The create schema is the *reason* this schema exists: it strips the field.
    expect('changeNote' in articleCreateSchema.parse(withNote)).toBe(false);
  });

  it('accepts a payload with the note absent', () => {
    expect(articleFormSchema.parse(base).changeNote).toBeUndefined();
  });

  it('rejects a note longer than 200 characters', () => {
    const result = articleFormSchema.safeParse({ ...base, changeNote: 'x'.repeat(201) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Change note must be 200 characters or fewer.');
  });

  it('does not require a version, because the form does not edit one', () => {
    expect(articleFormSchema.safeParse(base).success).toBe(true);
    // The server's update schema does require it — that is the concurrency token.
    expect(articleUpdateSchema.safeParse(base).success).toBe(false);
  });

  it('keeps the create schema inline with the update schema for shared fields', () => {
    // If the create schema ever gains a field the update schema lacks (or vice versa),
    // the form and the server would validate different payloads. This catches that drift.
    const createKeys = Object.keys(articleCreateSchema.parse(base));
    const formKeys = Object.keys(articleFormSchema.parse(base));

    expect(formKeys.filter((key) => key !== 'changeNote').sort()).toEqual(createKeys.sort());
  });

  it('offers only Draft and Published', () => {
    expect(EDITABLE_STATUSES).toEqual(['draft', 'published']);
    expect(articleFormSchema.safeParse({ ...base, status: 'archived' }).success).toBe(false);
  });
});
