import { describe, expect, it } from "vitest";
import { z } from "zod";
import { articleInput } from "./article";

function fieldErrorsFor(input: unknown) {
  const result = articleInput.safeParse(input);
  if (result.success) {
    throw new Error("Expected validation to fail");
  }
  return z.flattenError(result.error).fieldErrors;
}

describe("articleInput", () => {
  it("accepts a valid article", () => {
    const result = articleInput.safeParse({
      title: "Deploy checklist",
      content: "# Steps",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title with the exact required message", () => {
    expect(fieldErrorsFor({ title: "", content: "x" }).title).toEqual([
      "Title is required",
    ]);
  });

  it("rejects a whitespace-only title (trimmed before validation)", () => {
    expect(fieldErrorsFor({ title: "   ", content: "x" }).title).toEqual([
      "Title is required",
    ]);
  });

  it("trims surrounding whitespace from the title", () => {
    const result = articleInput.parse({
      title: "  Deploy checklist  ",
      content: "x",
    });
    expect(result.title).toBe("Deploy checklist");
  });

  it("accepts a 200-char title and rejects a 201-char title with the exact message", () => {
    expect(
      articleInput.safeParse({ title: "a".repeat(200), content: "x" }).success,
    ).toBe(true);

    expect(
      fieldErrorsFor({ title: "a".repeat(201), content: "x" }).title,
    ).toEqual(["Title must be 200 characters or fewer"]);
  });

  it("rejects empty content with the exact required message", () => {
    expect(fieldErrorsFor({ title: "t", content: "" }).content).toEqual([
      "Content is required",
    ]);
  });

  it("accepts 100,000-char content and rejects 100,001 with the exact message", () => {
    expect(
      articleInput.safeParse({ title: "t", content: "a".repeat(100_000) })
        .success,
    ).toBe(true);

    expect(
      fieldErrorsFor({ title: "t", content: "a".repeat(100_001) }).content,
    ).toEqual(["Content must be 100,000 characters or fewer"]);
  });

  it("reports both fields when both are invalid", () => {
    const fieldErrors = fieldErrorsFor({ title: "", content: "" });
    expect(fieldErrors.title).toEqual(["Title is required"]);
    expect(fieldErrors.content).toEqual(["Content is required"]);
  });

  it("rejects missing fields", () => {
    const result = articleInput.safeParse({});
    expect(result.success).toBe(false);
  });
});
