import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `src/app/actions/categories.ts` (iteration 6.2) — the category action and the
 * display-name cookie write.
 *
 * The same stubbing approach as `articles.test.ts`: real repositories against a
 * migrated temp database, with only the request-scoped Next.js APIs replaced. For the
 * cookie that means a small in-memory jar, which lets a test read back exactly what the
 * action wrote — including the options, which are part of the contract
 * (`httpOnly: false`, `sameSite: 'lax'`, one year, `path: '/'`).
 */

const revalidateSpy = vi.fn();
const setCookieSpy = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidateSpy(path),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
    set: (options: unknown) => setCookieSpy(options),
  }),
}));

vi.mock('@/server/logger', () => ({ logger: { info: () => undefined } }));

const { createCategory, setDisplayName } = await import('./categories');
const { createCategoryRepository } = await import('@/server/repositories/categories');
const { createTestDb } = await import('@/test/db');
const { initialActionState } = await import('@/types/domain');

type TestDb = ReturnType<typeof createTestDb>;

describe('createCategory action', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
    revalidateSpy.mockReset();
  });

  afterEach(() => {
    handle.close();
  });

  function form(name: string, description?: string): FormData {
    const data = new FormData();
    data.set('name', name);
    if (description !== undefined) data.set('description', description);
    return data;
  }

  it('creates the category and returns success', async () => {
    const state = await createCategory(initialActionState, form('Engineering'));

    expect(state.status).toBe('success');
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(1);
    // The sidebar reads the counts, so both list surfaces are revalidated.
    expect(revalidateSpy.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining(['/', '/categories']),
    );
  });

  it('reports a duplicate name as a form-level error and creates no second row', async () => {
    await createCategory(initialActionState, form('Engineering'));

    const state = await createCategory(initialActionState, form('engineering'));

    expect(state.status).toBe('error');
    // Form-level: `fieldErrors` is absent, so the dialog renders it in its own banner
    // rather than under the Name input.
    expect(state).toMatchObject({ status: 'error' });
    expect('fieldErrors' in state && state.fieldErrors).toBeFalsy();
    expect((state as { message: string }).message).toContain('already exists');
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(1);
  });

  it('rejects a 61-character name with the schema message', async () => {
    const state = await createCategory(initialActionState, form('x'.repeat(61)));

    expect(state).toEqual({
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: { name: ['Name must be 60 characters or fewer.'] },
    });
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(0);
  });

  it('treats an empty name as a field error rather than creating a row', async () => {
    const state = await createCategory(initialActionState, form('   '));

    expect(state).toMatchObject({ status: 'error', fieldErrors: { name: ['Name is required.'] } });
    expect(createCategoryRepository(handle.db).listWithCounts()).toHaveLength(0);
  });
});

describe('setDisplayName action', () => {
  beforeEach(() => {
    setCookieSpy.mockReset();
  });

  function form(name: string): FormData {
    const data = new FormData();
    data.set('displayName', name);
    return data;
  }

  it('writes the cookie with the documented options', async () => {
    const state = await setDisplayName(initialActionState, form('Jason'));

    expect(state.status).toBe('success');
    expect(setCookieSpy).toHaveBeenCalledWith({
      name: 'kb_display_name',
      value: 'Jason',
      // Read by a Client Component, so not httpOnly; a display label, not a credential.
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 31_536_000,
      path: '/',
    });
  });

  it('rejects an empty name without writing a cookie', async () => {
    const state = await setDisplayName(initialActionState, form(''));

    expect(state).toMatchObject({
      status: 'error',
      fieldErrors: { displayName: ['Name is required.'] },
    });
    expect(setCookieSpy).not.toHaveBeenCalled();
  });

  it('rejects a 41-character name without writing a cookie', async () => {
    const state = await setDisplayName(initialActionState, form('n'.repeat(41)));

    expect(state).toMatchObject({
      status: 'error',
      fieldErrors: { displayName: ['Name must be 40 characters or fewer.'] },
    });
    expect(setCookieSpy).not.toHaveBeenCalled();
  });
});
