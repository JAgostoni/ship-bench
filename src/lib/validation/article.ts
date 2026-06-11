import { z } from "zod";

// Error copy is normative (design spec §2.3) — these exact strings surface in
// API fieldErrors and, later, in the editor UI. Change them only via the spec.
export const articleInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(100_000, "Content must be 100,000 characters or fewer"),
});

export type ArticleInput = z.infer<typeof articleInput>;
