import { describe, expect, it } from 'vitest';
import { categoryCreateSchema } from './category';

describe('categoryCreateSchema', () => {
  it('accepts a name-only payload', () => {
    const parsed = categoryCreateSchema.parse({ name: 'Engineering' });
    expect(parsed.name).toBe('Engineering');
    expect(parsed.description).toBeUndefined();
  });

  it('trims the name and description', () => {
    const parsed = categoryCreateSchema.parse({
      name: '  Engineering  ',
      description: '  Notes  ',
    });
    expect(parsed.name).toBe('Engineering');
    expect(parsed.description).toBe('Notes');
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(categoryCreateSchema.safeParse({ name: '' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a 60-character name and rejects a 61-character name', () => {
    expect(categoryCreateSchema.safeParse({ name: 'a'.repeat(60) }).success).toBe(true);
    const result = categoryCreateSchema.safeParse({ name: 'a'.repeat(61) });
    expect(result.success).toBe(false);
    expect(result.success ? '' : result.error.issues[0].message).toBe(
      'Name must be 60 characters or fewer.',
    );
  });

  it('accepts a 200-character description and rejects a 201-character description', () => {
    expect(
      categoryCreateSchema.safeParse({ name: 'Eng', description: 'a'.repeat(200) }).success,
    ).toBe(true);
    const result = categoryCreateSchema.safeParse({ name: 'Eng', description: 'a'.repeat(201) });
    expect(result.success).toBe(false);
    expect(result.success ? '' : result.error.issues[0].message).toBe(
      'Description must be 200 characters or fewer.',
    );
  });

  it('normalizes an empty description to undefined', () => {
    expect(
      categoryCreateSchema.parse({ name: 'Eng', description: '' }).description,
    ).toBeUndefined();
    expect(
      categoryCreateSchema.parse({ name: 'Eng', description: '  ' }).description,
    ).toBeUndefined();
  });
});
