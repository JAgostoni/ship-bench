import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `src/app/actions/articles.ts` (iteration 6.1).
 *
 * The action is exercised through its real dependencies — a migrated SQLite temp
 * database and the real repository — with only the two request-scoped Next.js APIs
 * stubbed: `next/headers`' `cookies()` (there is no request in a unit test) and
 * `next/navigation`'s `redirect()` and `next/cache`'s `revalidatePath()`.
 *
 * **`redirect()` is stubbed, not caught.** It is the one call whose behaviour the
 * action's structure depends on: Next.js implements it by throwing a control-flow
 * signal, so the test replaces it with a `vi.fn()` that records the target. That lets
 * a test assert both *that* the action redirected and *where* — which is what proves
 * the `redirect()` sits outside a `try`/`catch` (a swallowed signal would leave the
 * spy uncalled).
 */

const redirectSpy = vi.fn();
const revalidateSpy = vi.fn();
const cookieJar = new Map<string, string>();
const logSpy = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (href: string) => {
    redirectSpy(href);
    // Mirror Next.js: `redirect()` never returns, it throws a control-flow signal.
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;${href}` });
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidateSpy(path),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (options: { name: string; value: string }) => cookieJar.set(options.name, options.value),
  }),
}));

vi.mock('@/server/logger', () => ({
  logger: { info: (...args: unknown[]) => logSpy(...args) },
}));

const { createArticle, updateArticle, archiveArticle, restoreArticle } = await import('./articles');
const { createArticleRepository } = await import('@/server/repositories/articles');
const { createRevisionRepository } = await import('@/server/repositories/revisions');
const { createTestDb } = await import('@/test/db');
const { initialActionState } = await import('@/types/domain');

type TestDb = ReturnType<typeof createTestDb>;

describe('article Server Actions', () => {
  let handle: TestDb;

  beforeEach(() => {
    handle = createTestDb();
    redirectSpy.mockReset();
    revalidateSpy.mockReset();
    logSpy.mockReset();
    cookieJar.clear();
  });

  afterEach(() => {
    handle.close();
  });

  /** The minimum valid payload, so each case can vary exactly one field. */
  function formData(overrides: Record<string, string> = {}): FormData {
    const data = new FormData();
    data.set('title', 'Deploying the API');
    data.set('bodyMd', '## Prerequisites\n\n- Node 24 LTS');
    data.set('status', 'draft');
    for (const [key, value] of Object.entries(overrides)) data.set(key, value);
    return data;
  }

  /** `redirect()` throws by design, so every success path has to be wrapped. */
  async function run(action: Promise<unknown>) {
    try {
      await action;
      return null;
    } catch (error) {
      return error as Error;
    }
  }

  describe('createArticle', () => {
    it('rejects a 2-character title with the schema message and writes nothing', async () => {
      const state = await createArticle(initialActionState, formData({ title: 'Hi' }));

      expect(state).toEqual({
        status: 'error',
        message: 'Please fix the highlighted fields.',
        fieldErrors: { title: ['Title must be at least 3 characters.'] },
      });
      expect(createArticleRepository(handle.db).countArticles()).toBe(0);
    });

    it('creates the article, writes revision 1, and reports the new version', async () => {
      const thrown = await run(createArticle(initialActionState, formData()));

      // The redirect target is the article's detail page carrying its toast intent.
      expect(thrown).toBeInstanceOf(Error);
      expect(redirectSpy).toHaveBeenCalledWith('/articles/deploying-the-api?toast=created');

      const created = createArticleRepository(handle.db).getArticleBySlug('deploying-the-api');
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.value.article.version).toBe(1);

      const revisions = createRevisionRepository(handle.db).listForArticle(
        created.value.article.id,
      );
      expect(revisions).toHaveLength(1);
      expect(revisions[0].revisionNumber).toBe(1);
    });

    it('revalidates every surface the create can change', async () => {
      await run(createArticle(initialActionState, formData()));

      expect(revalidateSpy.mock.calls.map(([path]) => path)).toEqual(
        expect.arrayContaining(['/', '/search', '/categories', '/articles/deploying-the-api']),
      );
    });

    it('shows the published toast when the article is created as published', async () => {
      await run(createArticle(initialActionState, formData({ status: 'published' })));

      expect(redirectSpy).toHaveBeenCalledWith('/articles/deploying-the-api?toast=published');
    });

    it('does not bypass validation when an unexpected field is added', async () => {
      const data = formData();
      // A hand-crafted POST trying to smuggle in fields the schema does not model.
      data.set('version', '99');
      data.set('id', '42');
      data.set('status', 'archived');
      data.set('editorName', 'Someone Else');

      const state = await createArticle(initialActionState, data);

      // `status: 'archived'` is not in `EDITABLE_STATUSES`, so the payload is rejected
      // rather than silently coerced; nothing is written either way.
      expect(state.status).toBe('error');
      expect(createArticleRepository(handle.db).countArticles()).toBe(0);
    });

    it('never logs the article body', async () => {
      const marker = 'SENSITIVE-BODY-MARKER-4f2a';
      await run(createArticle(initialActionState, formData({ bodyMd: `## ${marker}` })));

      expect(logSpy).toHaveBeenCalled();
      const serialized = JSON.stringify(logSpy.mock.calls);
      expect(serialized).not.toContain(marker);
      // The §7.6 field set is present.
      const [fields] = logSpy.mock.calls.at(-1) as [Record<string, unknown>];
      expect(Object.keys(fields).sort()).toEqual(
        ['articleId', 'durationMs', 'event', 'slug', 'version'].sort(),
      );
    });
  });

  describe('updateArticle', () => {
    /** Creates an article through the repository so the version is real. */
    function seedArticle() {
      const result = createArticleRepository(handle.db).createArticle({
        title: 'Deploying the API',
        bodyMd: '## Prerequisites',
        editorName: 'Ada Lovelace',
      });
      if (!result.ok) throw new Error('fixture failed');
      return result.value;
    }

    function editForm(overrides: Record<string, string> = {}): FormData {
      const data = new FormData();
      data.set('title', 'Deploying the API (updated)');
      data.set('bodyMd', '## Prerequisites\n\nUpdated body.');
      data.set('status', 'draft');
      for (const [key, value] of Object.entries(overrides)) data.set(key, value);
      return data;
    }

    it('returns conflict:true for a stale version and leaves the row unchanged', async () => {
      const created = seedArticle();

      const state = await updateArticle(
        initialActionState,
        editForm({ id: String(created.id), version: String(created.version + 5) }),
      );

      expect(state.status).toBe('error');
      expect(state).toMatchObject({ conflict: true });

      // The row is untouched: same title, same version.
      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('article vanished');
      expect(after.value.article.version).toBe(created.version);
      expect(after.value.article.title).toBe('Deploying the API');
      // And the conflict path wrote no revision.
      expect(createRevisionRepository(handle.db).listForArticle(created.id)).toHaveLength(1);
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it('saves a correct version and redirects with the saved toast', async () => {
      const created = seedArticle();

      await run(
        updateArticle(
          initialActionState,
          editForm({ id: String(created.id), version: String(created.version) }),
        ),
      );

      expect(redirectSpy).toHaveBeenCalledWith('/articles/deploying-the-api?toast=saved');
    });

    it('uses the published toast on a draft -> published transition', async () => {
      const created = seedArticle();

      await run(
        updateArticle(
          initialActionState,
          editForm({
            id: String(created.id),
            version: String(created.version),
            status: 'published',
            previousStatus: 'draft',
          }),
        ),
      );

      expect(redirectSpy).toHaveBeenCalledWith('/articles/deploying-the-api?toast=published');
    });

    it('does not claim a publish when the article was already published', async () => {
      const created = seedArticle();
      const repository = createArticleRepository(handle.db);
      repository.updateArticle(created.id, {
        version: created.version,
        title: 'Deploying the API',
        bodyMd: '## Prerequisites',
        status: 'published',
        editorName: 'Ada Lovelace',
      });
      const published = repository.getArticleById(created.id);
      if (!published.ok) throw new Error('article vanished');

      await run(
        updateArticle(
          initialActionState,
          editForm({
            id: String(published.value.article.id),
            version: String(published.value.article.version),
            status: 'published',
            previousStatus: 'published',
          }),
        ),
      );

      expect(redirectSpy).toHaveBeenCalledWith('/articles/deploying-the-api?toast=saved');
    });

    it('rejects an invalid payload with field errors and no redirect', async () => {
      const created = seedArticle();

      const state = await updateArticle(
        initialActionState,
        editForm({ id: String(created.id), version: '1', title: 'no' }),
      );

      expect(state).toMatchObject({
        status: 'error',
        fieldErrors: { title: ['Title must be at least 3 characters.'] },
      });
      expect(redirectSpy).not.toHaveBeenCalled();
    });
  });

  describe('the display-name cookie', () => {
    it('records the cookie value as the revision editor', async () => {
      cookieJar.set('kb_display_name', 'Grace Hopper');
      await run(createArticle(initialActionState, formData()));

      const created = createArticleRepository(handle.db).getArticleBySlug('deploying-the-api');
      if (!created.ok) throw new Error('article missing');
      const revisions = createRevisionRepository(handle.db).listForArticle(
        created.value.article.id,
      );

      expect(revisions[0].editorName).toBe('Grace Hopper');
    });

    it('falls back to Anonymous editor when the cookie is absent', async () => {
      await run(createArticle(initialActionState, formData()));

      const created = createArticleRepository(handle.db).getArticleBySlug('deploying-the-api');
      if (!created.ok) throw new Error('article missing');
      const revisions = createRevisionRepository(handle.db).listForArticle(
        created.value.article.id,
      );

      expect(revisions[0].editorName).toBe('Anonymous editor');
    });
  });

  describe('archiveArticle and restoreArticle', () => {
    function seedArticle() {
      const result = createArticleRepository(handle.db).createArticle({
        title: 'Incident Response Runbook',
        bodyMd: '## Severity levels',
        status: 'published',
        editorName: 'Ada Lovelace',
      });
      if (!result.ok) throw new Error('fixture failed');
      return result.value;
    }

    it('archives without deleting the row or its revisions', async () => {
      const created = seedArticle();
      const archiveForm = new FormData();
      archiveForm.set('id', String(created.id));

      // The action redirects like every other mutation, so its success path throws the
      // control-flow signal and the redirect target is the observable outcome.
      const thrown = await run(archiveArticle(initialActionState, archiveForm));

      expect(thrown).toBeInstanceOf(Error);
      expect(redirectSpy).toHaveBeenCalledWith(`/?toast=archived&archivedArticleId=${created.id}`);

      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('article was removed');
      expect(after.value.article.status).toBe('archived');
      expect(createRevisionRepository(handle.db).listForArticle(created.id).length).toBeGreaterThan(
        1,
      );
    });

    it('restores an archived article and reports the new version', async () => {
      const created = seedArticle();
      const archiveForm = new FormData();
      archiveForm.set('id', String(created.id));
      await run(archiveArticle(initialActionState, archiveForm));

      const state = await restoreArticle(created.id);

      expect(state.status).toBe('success');
      const after = createArticleRepository(handle.db).getArticleById(created.id);
      if (!after.ok) throw new Error('article vanished');
      expect(after.value.article.status).toBe('published');
    });

    it('refuses to archive an article that does not exist, without redirecting', async () => {
      const archiveForm = new FormData();
      archiveForm.set('id', '999999');

      const state = await archiveArticle(initialActionState, archiveForm);

      expect(state.status).toBe('error');
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it('never uses the word delete in the archive flow', async () => {
      // design-spec.md §10.6 rule 7. The UI copy is asserted in the component tests;
      // this is the guard that no server-side message leaks the word either.
      const created = seedArticle();
      const archiveForm = new FormData();
      archiveForm.set('id', String(created.id));
      await run(archiveArticle(initialActionState, archiveForm));

      const restored = await restoreArticle(created.id);
      const archiveError = await archiveArticle(initialActionState, new FormData());

      expect(JSON.stringify(archiveError).toLowerCase()).not.toContain('delete');
      expect(JSON.stringify(restored).toLowerCase()).not.toContain('delete');
      // The redirect target the archive produces is part of the user-visible contract.
      expect(String(redirectSpy.mock.calls.at(-1)?.[0]).toLowerCase()).not.toContain('delete');
    });
  });
});
