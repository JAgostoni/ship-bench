"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { removeArticleFromFts, syncArticleToFts } from "@/lib/fts";
import {
  articleFormSchema,
  type ArticleFormInput,
} from "@/lib/validation/article";
import { makeExcerpt, stripHtml } from "@/lib/utils/excerpt";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { revalidateArticlePaths } from "@/lib/utils/revalidate";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | {
      ok: false;
      code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "UNIQUE" | "INTERNAL";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * Parse FormData from ArticleForm into a shape Zod can validate.
 * Not exported — "use server" modules may only export async actions.
 */
function parseArticleFormData(formData: FormData): Record<string, unknown> {
  const tagIds = formData
    .getAll("tagIds")
    .map(String)
    .filter((id) => id.length > 0);

  const categoryRaw = formData.get("categoryId");
  const categoryId =
    categoryRaw === null || categoryRaw === ""
      ? null
      : String(categoryRaw);

  const expectedRaw = formData.get("expectedUpdatedAt");
  const expectedUpdatedAt =
    expectedRaw === null || expectedRaw === ""
      ? undefined
      : String(expectedRaw);

  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    contentHtml: String(formData.get("contentHtml") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    categoryId,
    tagIds,
    ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
  };
}

function fieldErrorsFromZod(
  error: import("zod").ZodError,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

async function replaceArticleTags(
  articleId: string,
  tagIds: string[],
): Promise<void> {
  await prisma.articleTag.deleteMany({ where: { articleId } });
  if (tagIds.length === 0) return;

  // Only link tags that exist (ignore stale ids)
  const existing = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true },
  });
  const validIds = existing.map((t) => t.id);
  if (validIds.length === 0) return;

  await prisma.articleTag.createMany({
    data: validIds.map((tagId) => ({ articleId, tagId })),
  });
}

/**
 * Create article — validate, sanitize, persist, FTS sync, revalidate, redirect.
 */
export async function createArticle(
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const raw = parseArticleFormData(formData);
  const parsed = articleFormSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data: ArticleFormInput = parsed.data;
  const contentHtml = sanitizeHtml(data.contentHtml);
  const excerpt = makeExcerpt(contentHtml);
  const plainContent = stripHtml(contentHtml);

  // Validate category exists when set
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!cat) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Please fix the errors below.",
        fieldErrors: { categoryId: ["Selected category was not found."] },
      };
    }
  }

  try {
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: data.slug,
        contentHtml,
        excerpt,
        status: data.status,
        categoryId: data.categoryId,
      },
    });

    await replaceArticleTags(article.id, data.tagIds ?? []);
    await syncArticleToFts(article.id, article.title, plainContent);
    revalidateArticlePaths(article.slug);

    redirect(`/articles/${article.slug}`);
  } catch (err) {
    // Next.js redirect throws a special error — rethrow it
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    if (isUniqueConstraintError(err)) {
      return {
        ok: false,
        code: "UNIQUE",
        message: "An article with this slug already exists.",
        fieldErrors: {
          slug: ["An article with this slug already exists."],
        },
      };
    }

    console.error("[actions/articles] createArticle failed:", err);
    return {
      ok: false,
      code: "INTERNAL",
      message: "Could not create the article. Please try again.",
    };
  }
}

/**
 * Update article with optimistic concurrency via expectedUpdatedAt.
 */
export async function updateArticle(
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Article not found.",
    };
  }

  const raw = parseArticleFormData(formData);
  const parsed = articleFormSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please fix the errors below.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const data: ArticleFormInput = parsed.data;

  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Article not found.",
      };
    }

    if (
      data.expectedUpdatedAt &&
      existing.updatedAt.toISOString() !== data.expectedUpdatedAt
    ) {
      return {
        ok: false,
        code: "CONFLICT",
        message:
          "This article changed since you opened it. Reload to get the latest version.",
      };
    }

    if (data.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!cat) {
        return {
          ok: false,
          code: "VALIDATION",
          message: "Please fix the errors below.",
          fieldErrors: { categoryId: ["Selected category was not found."] },
        };
      }
    }

    const contentHtml = sanitizeHtml(data.contentHtml);
    const excerpt = makeExcerpt(contentHtml);
    const plainContent = stripHtml(contentHtml);
    const previousSlug = existing.slug;

    const article = await prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        contentHtml,
        excerpt,
        status: data.status,
        categoryId: data.categoryId,
      },
    });

    await replaceArticleTags(article.id, data.tagIds ?? []);
    await syncArticleToFts(article.id, article.title, plainContent);
    revalidateArticlePaths(article.slug, previousSlug);

    redirect(`/articles/${article.slug}`);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    if (isUniqueConstraintError(err)) {
      return {
        ok: false,
        code: "UNIQUE",
        message: "An article with this slug already exists.",
        fieldErrors: {
          slug: ["An article with this slug already exists."],
        },
      };
    }

    console.error("[actions/articles] updateArticle failed:", err);
    return {
      ok: false,
      code: "INTERNAL",
      message: "Could not update the article. Please try again.",
    };
  }
}

/**
 * Hard-delete article, cascade tags, remove FTS, revalidate, redirect home.
 */
export async function deleteArticle(
  id: string,
): Promise<ActionResult> {
  if (!id) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Article not found.",
    };
  }

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!existing) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Article not found.",
      };
    }

    await prisma.article.delete({ where: { id: existing.id } });
    await removeArticleFromFts(existing.id);
    revalidateArticlePaths(existing.slug);

    redirect("/");
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    console.error("[actions/articles] deleteArticle failed:", err);
    return {
      ok: false,
      code: "INTERNAL",
      message: "Could not delete the article. Please try again.",
    };
  }
}
