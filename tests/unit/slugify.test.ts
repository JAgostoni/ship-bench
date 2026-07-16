import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("converts spaces to hyphens and lowercases", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("New Hire Onboarding")).toBe("new-hire-onboarding");
  });

  it("collapses multiple separators into a single hyphen", () => {
    expect(slugify("hello   world")).toBe("hello-world");
    expect(slugify("foo---bar")).toBe("foo-bar");
    expect(slugify("a  --  b")).toBe("a-b");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
    expect(slugify("---hello---")).toBe("hello");
  });

  it("strips unsafe characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
    expect(slugify("C++ tips & tricks")).toBe("c-tips-tricks");
    expect(slugify("foo@bar#baz")).toBe("foo-bar-baz");
  });

  it("normalizes unicode diacritics", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
    expect(slugify("naïve")).toBe("naive");
  });

  it("handles empty and edge inputs", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("123")).toBe("123");
    expect(slugify("a")).toBe("a");
  });

  it("keeps alphanumerics as-is when already slug-like", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
    expect(slugify("runbook_v2")).toBe("runbook-v2");
  });
});
