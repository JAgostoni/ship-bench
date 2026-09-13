'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { categoryCreateSchema } from '@/lib/validation/category';
import { displayNameSchema } from '@/lib/validation/display-name';
import { logger } from '@/server/logger';
import { categoryRepository } from '@/server/repositories/categories';
import { DISPLAY_NAME_COOKIE, DISPLAY_NAME_MAX_AGE } from '@/server/display-name';
import type { ActionState } from '@/types/domain';

/**
 * The category and display-name Server Actions (`docs/iterations/iteration-6.md`
 * tasks 6.2 and 6.7).
 *
 * Both follow the article actions' contract (`architecture.md` §7.5): parse with
 * the shared Zod schema, return field errors instead of throwing, revalidate the
 * surfaces the write changes. Neither redirects — both are submitted from a
 * dialog that stays open and renders its own success, so the "redirect outside
 * `try`/`catch`" rule has no bearing here.
 */

type FieldErrors = Record<string, string[]>;

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

/**
 * `POST /api/categories`'s UI twin. A duplicate name (case-insensitive) is a
 * `CONFLICT` in the repository and a **form-level** error here, not a field error:
 * it is a statement about the set of categories, not about the `Name` field's
 * format, and rendering it under the input would imply the user typed something
 * malformed (design-spec.md §4.4).
 */
export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categoryCreateSchema.safeParse({
    name: formData.get('name') ?? '',
    ...(formData.get('description') !== null ? { description: formData.get('description') } : {}),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const startedAt = Date.now();
  const result = categoryRepository.create(parsed.data);

  if (!result.ok) {
    return {
      status: 'error',
      message:
        result.error.code === 'CONFLICT'
          ? result.error.message
          : "We couldn't create that category. Please try again.",
    };
  }

  logger.info(
    {
      event: 'category.create',
      categoryId: result.value.id,
      slug: result.value.slug,
      durationMs: Date.now() - startedAt,
    },
    'category.create',
  );

  // The sidebar renders the new row and its count, so both list surfaces and the
  // shell that reads the counts must be invalidated.
  revalidatePath('/');
  revalidatePath('/categories');
  return { status: 'success', articleId: 0, slug: result.value.slug, version: 0 };
}

/**
 * Writes the `kb_display_name` cookie (design-spec.md §4.6).
 *
 * `httpOnly: false` is required rather than lax: the sidebar chip is a Client
 * Component and reads the value so it can render the current name without a round
 * trip. The value is a display label, not a credential — v1 has no authentication
 * at all (`architecture.md` §16.1 A1) — so client readability leaks nothing.
 *
 * `ActionState.success` is reused with `articleId: 0` because the union is shared
 * across mutations and a display name has no article. The alternative — widening
 * the union per action — would complicate the form contract for no benefit.
 */
export async function setDisplayName(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = displayNameSchema.safeParse({ displayName: formData.get('displayName') ?? '' });

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const store = await cookies();
  store.set({
    name: DISPLAY_NAME_COOKIE,
    value: parsed.data.displayName,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: DISPLAY_NAME_MAX_AGE,
    path: '/',
  });

  logger.info({ event: 'displayName.set' }, 'displayName.set');

  // The chip is rendered by the shell, so invalidating the current path is what
  // makes the new name appear without a manual reload.
  revalidatePath('/');
  return { status: 'success', articleId: 0, slug: '', version: 0 };
}
