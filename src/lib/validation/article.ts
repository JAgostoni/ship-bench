import { z } from "zod";
import { stripHtml } from "@/lib/utils/excerpt";

export const articleStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

/**
 * Shared create/edit form schema — architecture §7.3.
 * Empty TipTap docs (`<p></p>`) fail content validation via plain-text check.
 */
export const articleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens",
    ),
  contentHtml: z
    .string()
    .max(200_000)
    .refine((html) => stripHtml(html).length > 0, {
      message: "Content is required",
    }),
  status: articleStatusSchema,
  categoryId: z
    .union([z.string().cuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  tagIds: z.array(z.string().cuid()).max(20).default([]),
  expectedUpdatedAt: z.string().datetime().optional(),
});

export type ArticleFormInput = z.infer<typeof articleFormSchema>;

/** Raw input before Zod defaults/transforms (useful for forms). */
export type ArticleFormValues = z.input<typeof articleFormSchema>;
