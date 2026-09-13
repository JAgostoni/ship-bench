import { z } from 'zod';

/**
 * The `Editing as` display name (design-spec.md §4.6).
 *
 * 1–40 characters, matching the `kb_display_name` cookie contract in
 * `docs/iterations/iteration-6.md` task 6.2. `required` is deliberate: an empty
 * name is not a name, and the editor must not be able to blank it and silently
 * fall back to `Anonymous editor`.
 *
 * This is **not** authentication. The value is a label recorded on a revision
 * row so History reads as a person rather than as "Anonymous editor" for
 * everyone (design-spec.md U4).
 */
export const displayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(40, 'Name must be 40 characters or fewer.'),
});

export type DisplayNameInput = z.infer<typeof displayNameSchema>;
