import { describe, expect, it } from "vitest";
import { setupInMemoryDb } from "@/lib/test/db";
import { createArticle, sanitizeFtsQuery, searchArticles } from "./articles";

setupInMemoryDb();

describe("sanitizeFtsQuery", () => {
  it("wraps terms as quoted prefix tokens joined with spaces", () => {
    expect(sanitizeFtsQuery("deploy serv")).toBe('"deploy"* "serv"*');
  });

  it("strips FTS5 operators and punctuation", () => {
    expect(sanitizeFtsQuery('"deploy" -staging*')).toBe('"deploy"* "staging"*');
  });

  it.each([
    ["empty string", ""],
    ["whitespace only", "   \t\n"],
    ["quotes only", '"""'],
    ["dashes only", "---"],
    ["asterisks only", "***"],
    ["emoji only", "🎉🚀"],
  ])("returns null for %s", (_label, input) => {
    expect(sanitizeFtsQuery(input)).toBeNull();
  });
});

describe("searchArticles", () => {
  function seedCorpus() {
    createArticle({
      title: "Deploy checklist",
      content: "Steps to follow before every release.",
    });
    createArticle({
      title: "Onboarding guide",
      content: "How we deploy services and review code.",
    });
    createArticle({
      title: "Meeting notes",
      content: "Notes from the weekly sync about expenses.",
    });
  }

  it("matches on prefixes", () => {
    seedCorpus();
    const { results, total } = searchArticles("depl");

    expect(total).toBe(2);
    expect(results.map((r) => r.title)).toContain("Deploy checklist");
  });

  it("ranks a title match above a content-only match", () => {
    seedCorpus();
    const { results } = searchArticles("deploy");

    expect(results.map((r) => r.title)).toEqual([
      "Deploy checklist",
      "Onboarding guide",
    ]);
  });

  it("returns snippets with <mark> highlights from content", () => {
    seedCorpus();
    const { results } = searchArticles("services");

    expect(results).toHaveLength(1);
    expect(results[0]?.snippet).toContain("<mark>services</mark>");
  });

  it("respects the limit while total counts all matches", () => {
    seedCorpus();
    const { results, total } = searchArticles("deploy", 1);

    expect(results).toHaveLength(1);
    expect(total).toBe(2);
  });

  it("caps the limit at 50 and floors it at 1 without throwing", () => {
    seedCorpus();
    expect(() => searchArticles("deploy", 9999)).not.toThrow();
    expect(searchArticles("deploy", 0).results).toHaveLength(1);
  });

  it("returns result rows shaped { id, title, snippet, updatedAt }", () => {
    seedCorpus();
    const { results } = searchArticles("checklist");

    expect(results[0]).toEqual({
      id: expect.any(Number),
      title: "Deploy checklist",
      snippet: expect.any(String),
      updatedAt: expect.any(Number),
    });
  });

  it.each([
    ["double quote", '"'],
    ["dash", "-"],
    ["asterisk", "*"],
    ["empty string", ""],
    ["whitespace only", "   "],
    ["emoji only", "🎉"],
  ])("never throws and returns empty results for %s input", (_label, q) => {
    seedCorpus();
    expect(() => searchArticles(q)).not.toThrow();
    expect(searchArticles(q)).toEqual({ results: [], total: 0 });
  });

  it("treats operator characters around terms as separators, not syntax", () => {
    seedCorpus();
    // Raw FTS5 would reject this query string; the sanitizer must not.
    const { results } = searchArticles('-"deploy*');

    expect(results.map((r) => r.title)).toContain("Deploy checklist");
  });
});
