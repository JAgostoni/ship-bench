import { z } from 'zod';

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export const EDITABLE_STATUSES = ['draft', 'published'] as const;

export const articleCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(200, 'Title must be 200 characters or fewer.'),
  summary: z
    .string()
    .trim()
    .max(300, 'Summary must be 300 characters or fewer.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  bodyMd: z
    .string()
    .min(1, 'Article body cannot be empty.')
    .max(200_000, 'Article body is too large (200,000 character limit).'),
  categoryId: z.coerce.number().int().positive().nullable().default(null),
  status: z.enum(EDITABLE_STATUSES).default('draft'),
});
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

export const articleUpdateSchema = articleCreateSchema.extend({
  version: z.coerce.number().int().nonnegative(),
  changeNote: z.string().trim().max(200).optional(),
});
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

/**
 * The **client form's** schema: everything a create collects, plus the edit-only change
 * note, and *without* `version`.
 *
 * **Why it exists.** `version` is not a value the user edits — it is the
 * optimistic-concurrency token, supplied by a hidden field that only the edit route
 * renders. And the change note cannot be folded into `articleCreateSchema`, because a
 * create genuinely has no prior state to describe (E3).
 *
 * The form matters for a non-obvious reason: `zodResolver` **replaces** the submitted
 * values with the schema's *output*, so any field the schema does not declare is dropped
 * before the form ever sees it. Running the create schema on the edit route would
 * therefore silently discard the change note — the revision would be written with a
 * `null` note even though the author typed one. Declaring the field here is what keeps it
 * in the payload.
 */
export const articleFormSchema = articleCreateSchema.extend({
  changeNote: z.string().trim().max(200, 'Change note must be 200 characters or fewer.').optional(),
});
export type ArticleFormInput = z.infer<typeof articleFormSchema>;
