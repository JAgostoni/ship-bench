import { describe, expect, it } from "vitest";
import { articleFormSchema } from "@/lib/validation/article";

const validBase = {
  title: "How we deploy",
  slug: "how-we-deploy",
  contentHtml: "<p>We deploy via GitHub Actions.</p>",
  status: "PUBLISHED" as const,
  categoryId: null,
  tagIds: [] as string[],
};

describe("articleFormSchema", () => {
  it("accepts a valid payload", () => {
    const result = articleFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("How we deploy");
      expect(result.data.tagIds).toEqual([]);
      expect(result.data.categoryId).toBeNull();
    }
  });

  it("rejects missing / empty title", () => {
    const empty = articleFormSchema.safeParse({ ...validBase, title: "" });
    expect(empty.success).toBe(false);

    const whitespace = articleFormSchema.safeParse({
      ...validBase,
      title: "   ",
    });
    expect(whitespace.success).toBe(false);
  });

  it("rejects a bad slug", () => {
    const bad = articleFormSchema.safeParse({
      ...validBase,
      slug: "Hello World",
    });
    expect(bad.success).toBe(false);

    const empty = articleFormSchema.safeParse({ ...validBase, slug: "" });
    expect(empty.success).toBe(false);

    const leadingHyphen = articleFormSchema.safeParse({
      ...validBase,
      slug: "-bad",
    });
    expect(leadingHyphen.success).toBe(false);
  });

  it("requires non-empty content (plain text after strip)", () => {
    const emptyHtml = articleFormSchema.safeParse({
      ...validBase,
      contentHtml: "",
    });
    expect(emptyHtml.success).toBe(false);

    const emptyParagraph = articleFormSchema.safeParse({
      ...validBase,
      contentHtml: "<p></p>",
    });
    expect(emptyParagraph.success).toBe(false);

    const whitespaceOnly = articleFormSchema.safeParse({
      ...validBase,
      contentHtml: "<p>   </p>",
    });
    expect(whitespaceOnly.success).toBe(false);
  });

  it("enforces max lengths on title and slug", () => {
    const longTitle = articleFormSchema.safeParse({
      ...validBase,
      title: "a".repeat(201),
    });
    expect(longTitle.success).toBe(false);

    const longSlug = articleFormSchema.safeParse({
      ...validBase,
      slug: "a".repeat(121),
    });
    expect(longSlug.success).toBe(false);
  });

  it("enforces tagIds max of 20", () => {
    // Zod cuid(): "c" + 24 alphanumerics
    const makeCuid = (n: number) => `c${n.toString().padStart(24, "0")}`;

    const twenty = articleFormSchema.safeParse({
      ...validBase,
      tagIds: Array.from({ length: 20 }, (_, i) => makeCuid(i + 1)),
    });
    expect(twenty.success).toBe(true);

    const twentyOne = articleFormSchema.safeParse({
      ...validBase,
      tagIds: Array.from({ length: 21 }, (_, i) => makeCuid(i + 1)),
    });
    expect(twentyOne.success).toBe(false);
  });

  it("transforms empty categoryId to null and defaults tagIds", () => {
    const result = articleFormSchema.safeParse({
      title: "Draft note",
      slug: "draft-note",
      contentHtml: "<p>Body text</p>",
      status: "DRAFT",
      categoryId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBeNull();
      expect(result.data.tagIds).toEqual([]);
    }
  });

  it("accepts optional expectedUpdatedAt ISO datetime", () => {
    const ok = articleFormSchema.safeParse({
      ...validBase,
      expectedUpdatedAt: "2026-07-10T14:14:00.000Z",
    });
    expect(ok.success).toBe(true);

    const bad = articleFormSchema.safeParse({
      ...validBase,
      expectedUpdatedAt: "not-a-date",
    });
    expect(bad.success).toBe(false);
  });
});
