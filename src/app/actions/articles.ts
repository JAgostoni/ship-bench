'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { articleCreateSchema, articleUpdateSchema } from '@/lib/validation/article';
import { readDisplayName } from '@/server/display-name';
import { logger } from '@/server/logger';
import { articleRepository } from '@/server/repositories/articles';
import type { ActionState } from '@/types/domain';

/**
 * The article mutation Server Actions (`architecture.md` §7.5, §10.2).
 *
 * Every one of these follows the same four-step shape, and the order is load
 * bearing:
 *
 * 1. Pick the known fields out of `FormData`, then run the **same** Zod schema the
 *    client form used. A hand-crafted POST therefore cannot bypass validation
 *    (§6.4's guarantee 2).
 * 2. A validation failure returns `{ status: 'error', fieldErrors }` — **never a
 *    throw**, because a thrown error in a Server Action surfaces as the generic
 *    route error boundary instead of inline field messages.
 * 3. The repository is called with the resolved editor name, then `revalidatePath`
 *    runs for every surface the write can change.
 * 4. `redirect()` runs **outside any `try`/`catch`**.
 *
 * On (4): `redirect()` works by throwing a `NEXT_REDIRECT` control-flow signal, so
 * a `catch` wrapped around it swallows the signal and the user watches a form do
 * nothing. Next.js documents this explicitly and it is the most common way to
 * silently break a Server Action — hence the "repository first, redirect after"
 * shape rather than one enclosing `try`.
 */

type FieldErrors = Record<string, string[]>;

/**
 * The fields each schema accepts, read out of `FormData` by name.
 *
 * `Object.fromEntries(formData)` alone would hand the schema an
 * attacker-controlled key set. Picking the keys explicitly makes the payload
 * shape a property of the action rather than of the request, so an extra
 * `status=archived`-shaped field is dropped rather than rejected ambiguously.
 */
function pick(formData: FormData, keys: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (value !== null) picked[key] = value;
  }
  return picked;
}

/** Zod's issues, grouped by field so `Field`'s `error` prop can read the first. */
function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

/**
 * The four surfaces a write can change (`architecture.md` §7.5).
 *
 * `slug` is optional because archive does not have a destination to refresh; the
 * caller passes it when it knows one.
 */
function revalidateArticleSurfaces(slug?: string) {
  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath('/categories');
  if (slug) revalidatePath(`/articles/${slug}`);
}

/** §7.6's field set and nothing else — article bodies are never logged (§13.2). */
function logMutation(fields: {
  event: string;
  articleId: number;
  slug: string;
  version: number;
  durationMs: number;
}) {
  logger.info(fields, fields.event);
}

function conflictState(): ActionState {
  return {
    status: 'error',
    message: 'This article was updated by someone else. Your changes were not saved.',
    conflict: true,
  };
}

function saveFailedState(error: AppError): ActionState {
  if (error.code === 'CONFLICT') return conflictState();
  return { status: 'error', message: "We couldn't save your changes. Your text is still here." };
}

/**
 * `POST` — create an article and land on its detail page.
 *
 * The `published_at` stamp is the repository's decision, so the action only picks
 * *which* toast the destination shows: creating straight into `published` says
 * `Article published.`, because the state change is invisible once the user has
 * been redirected away (design-spec.md §4.3).
 */
export async function createArticle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = articleCreateSchema.safeParse(
    pick(formData, ['title', 'summary', 'bodyMd', 'categoryId', 'status']),
  );

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const editorName = await readDisplayName();
  const startedAt = Date.now();
  const result = articleRepository.createArticle({ ...parsed.data, editorName });

  // `createArticle` cannot report a version conflict (there is no prior version);
  // a unique-constraint collision maps to CONFLICT and is surfaced as copy rather
  // than retried silently.
  if (!result.ok) {
    if (result.error.code === 'CONFLICT') {
      return { status: 'error', message: 'That title is already in use by another article.' };
    }
    return saveFailedState(result.error);
  }

  const { id, slug, version } = result.value;
  logMutation({
    event: 'article.create',
    articleId: id,
    slug,
    version,
    durationMs: Date.now() - startedAt,
  });

  revalidateArticleSurfaces(slug);
  redirect(
    `/articles/${slug}?toast=${parsed.data.status === 'published' ? 'published' : 'created'}`,
  );
}

/**
 * Save an edit under optimistic concurrency (`architecture.md` §9.4).
 *
 * `version` arrives as a hidden field and is re-validated here; a stale value
 * makes the repository return `CONFLICT`, which becomes the form's conflict
 * banner rather than a route error (design-spec.md §5.5).
 */
export async function updateArticle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = articleUpdateSchema.safeParse(
    pick(formData, ['version', 'title', 'summary', 'bodyMd', 'categoryId', 'status', 'changeNote']),
  );

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: 'error', message: "We couldn't save your changes. Your text is still here." };
  }

  const editorName = await readDisplayName();
  const startedAt = Date.now();
  const result = articleRepository.updateArticle(id, { ...parsed.data, editorName });

  if (!result.ok) {
    if (result.error.code === 'CONFLICT') return conflictState();
    // A `VALIDATION_FAILED` from the repository carries field-level detail (an
    // unknown category id, say), which is more useful inline than as a banner.
    const details = result.error.details?.errors as { path: string; message: string }[] | undefined;
    return {
      status: 'error',
      message: "We couldn't save your changes. Your text is still here.",
      ...(details
        ? {
            fieldErrors: fieldErrorsFrom(
              details.map((d) => ({ path: [d.path], message: d.message })),
            ),
          }
        : {}),
    };
  }

  const { slug, version } = result.value;
  logMutation({
    event: 'article.update',
    articleId: id,
    slug,
    version,
    durationMs: Date.now() - startedAt,
  });

  revalidateArticleSurfaces(slug);

  // `Article published.` replaces `Article saved.` on a draft→published save
  // (design-spec.md §7.6). The form sends the pre-save status in a hidden field,
  // which is the only way the action can tell a publish apart from a re-save of an
  // already-published article.
  const wasPublished = formData.get('previousStatus') === 'published';
  const becamePublished = parsed.data.status === 'published' && !wasPublished;
  redirect(`/articles/${slug}?toast=${becamePublished ? 'published' : 'saved'}`);
}

/**
 * Soft-archive. Never a hard delete (`architecture.md` §7.3, design-spec.md U9), and
 * the word "delete" appears in no user-facing copy anywhere in the app.
 *
 * It redirects like every other mutation (§7.5) rather than returning a state, because
 * an archived article disappears from the default browse and search views — the detail
 * page the user is standing on is no longer a sensible place to confirm from. The
 * destination carries both the toast intent and the id, which is what lets the toast's
 * `Undo` (UX11) restore the exact article without the client remembering anything.
 */
export async function archiveArticle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: 'error', message: "We couldn't archive that article." };
  }

  const editorName = await readDisplayName();
  const startedAt = Date.now();
  const result = articleRepository.archiveArticle(id, editorName);

  if (!result.ok) {
    return { status: 'error', message: "We couldn't archive that article." };
  }

  const { slug, version } = result.value;
  logMutation({
    event: 'article.archive',
    articleId: id,
    slug,
    version,
    durationMs: Date.now() - startedAt,
  });

  revalidateArticleSurfaces(slug);
  redirect(`/?toast=archived&archivedArticleId=${id}`);
}

/**
 * The `Undo` action on the archive toast (design-spec.md §7.6, UX11).
 *
 * A restore is an ordinary version-checked save rather than a second write path:
 * it reads the current version first and saves against it, so the 5-second window
 * cannot race another author's save into a silent overwrite. If someone did save
 * in the meantime, the version check fails and the article is left archived
 * instead of being clobbered.
 */
export async function restoreArticle(articleId: number): Promise<ActionState> {
  const current = articleRepository.getArticleById(articleId);
  if (!current.ok) {
    return { status: 'error', message: "We couldn't restore that article." };
  }

  const { article } = current.value;
  const editorName = await readDisplayName();
  const startedAt = Date.now();

  const result = articleRepository.updateArticle(article.id, {
    version: article.version,
    title: article.title,
    bodyMd: article.bodyMd,
    summary: article.summary,
    categoryId: article.category?.id ?? null,
    status: 'published',
    changeNote: 'Restored from archive',
    editorName,
  });

  if (!result.ok) {
    return {
      status: 'error',
      message:
        result.error.code === 'CONFLICT'
          ? 'This article changed while it was archived, so it was not restored.'
          : "We couldn't restore that article.",
    };
  }

  logMutation({
    event: 'article.restore',
    articleId,
    slug: result.value.slug,
    version: result.value.version,
    durationMs: Date.now() - startedAt,
  });

  revalidateArticleSurfaces(result.value.slug);
  return { status: 'success', articleId, slug: result.value.slug, version: result.value.version };
}
