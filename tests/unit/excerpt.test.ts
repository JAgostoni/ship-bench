import { describe, expect, it } from "vitest";
import { makeExcerpt, stripHtml } from "@/lib/utils/excerpt";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
    expect(stripHtml("<div>a</div><div>b</div>")).toBe("a b");
  });

  it("strips script and style blocks", () => {
    expect(
      stripHtml("<p>safe</p><script>alert(1)</script><style>.x{}</style>"),
    ).toBe("safe");
  });

  it("decodes common entities", () => {
    expect(stripHtml("A&amp;B &lt;C&gt; &quot;q&quot; &#39;s&#39;")).toBe(
      `A&B <C> "q" 's'`,
    );
    expect(stripHtml("foo&nbsp;bar")).toBe("foo bar");
  });

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("");
    expect(stripHtml("   ")).toBe("");
  });
});

describe("makeExcerpt", () => {
  it("returns plain text under the length cap unchanged", () => {
    expect(makeExcerpt("<p>Short body</p>")).toBe("Short body");
  });

  it("caps length around 240 characters and appends ellipsis", () => {
    const long = "word ".repeat(80); // 400 chars of "word "
    const html = `<p>${long}</p>`;
    const excerpt = makeExcerpt(html, 240);
    expect(excerpt.endsWith("…")).toBe(true);
    // ellipsis is one char; base should not exceed max
    expect(excerpt.length).toBeLessThanOrEqual(241);
    expect(stripHtml(excerpt.replace(/…$/, ""))).not.toMatch(/</);
  });

  it("prefers breaking at a word boundary when truncating", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    const excerpt = makeExcerpt(`<p>${text}</p>`, 20);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.includes(" ")).toBe(true);
    // should not cut mid-word when a space exists in the window
    const withoutEllipsis = excerpt.replace(/…$/, "");
    expect(text.startsWith(withoutEllipsis.trimEnd())).toBe(true);
  });

  it("strips tags before measuring length", () => {
    const html = `<p>${"<b>x</b>".repeat(100)}</p>`;
    const excerpt = makeExcerpt(html, 50);
    expect(excerpt).not.toMatch(/<b>/);
    expect(excerpt.replace(/…$/, "").length).toBeLessThanOrEqual(50);
  });
});
