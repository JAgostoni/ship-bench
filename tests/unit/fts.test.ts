import { describe, expect, it } from "vitest";
import { sanitizeFtsSnippet, toFtsQuery } from "@/lib/fts";

describe("toFtsQuery", () => {
  it("returns empty string for empty / whitespace", () => {
    expect(toFtsQuery("")).toBe("");
    expect(toFtsQuery("   ")).toBe("");
  });

  it("builds prefix AND query for a single token", () => {
    expect(toFtsQuery("onboarding")).toBe("onboarding*");
    expect(toFtsQuery("  OnBoard  ")).toBe("onboard*");
  });

  it("joins multiple tokens with AND", () => {
    expect(toFtsQuery("new hire")).toBe("new* AND hire*");
  });

  it("strips special characters so MATCH never 500s", () => {
    expect(toFtsQuery('foo"bar* baz')).toBe("foobar* AND baz*");
    expect(toFtsQuery("!!!")).toBe("");
    expect(toFtsQuery("@#$ %^&")).toBe("");
  });

  it("keeps alphanumerics, underscore, hyphen", () => {
    expect(toFtsQuery("run-book_v2")).toBe("run-book_v2*");
  });
});

describe("sanitizeFtsSnippet", () => {
  it("keeps mark tags and strips others", () => {
    expect(sanitizeFtsSnippet("hello <mark>world</mark>")).toBe(
      "hello <mark>world</mark>",
    );
    expect(
      sanitizeFtsSnippet('<script>x</script>hi <mark>there</mark> <b>bold</b>'),
    ).toBe("xhi <mark>there</mark> bold");
  });

  it("handles empty input", () => {
    expect(sanitizeFtsSnippet("")).toBe("");
  });
});
