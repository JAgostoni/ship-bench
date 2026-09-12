import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(60, 'Name must be 60 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(200, 'Description must be 200 characters or fewer.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
