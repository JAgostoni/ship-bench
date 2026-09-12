import { z } from 'zod';

/** Treats an empty or whitespace-only query parameter as absent. */
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Query-string contract from architecture.md §7.4.
 *
 * Every field ends in `.catch(...)` so a malformed or unknown URL degrades to a
 * default instead of returning 400: a shared link must always render
 * (architecture.md §6.2). `pageSize` additionally clamps into range rather than
 * discarding an out-of-range number, because §7.3's table documents it as
 * "Clamped, never rejected".
 */
export const listQuerySchema = z.object({
  q: z.string().trim().max(200).catch(''),
  category: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(['published', 'draft', 'all']).catch('published'),
  sort: z.enum(['updated', 'created', 'title']).catch('updated'),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z
    .preprocess(blankToUndefined, z.coerce.number().int())
    .catch(20)
    .transform((v) => Math.min(50, Math.max(1, v))),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
