import { describe, expect, it } from "vitest";
import { parseSnippet } from "./Snippet";

describe("parseSnippet", () => {
  it("returns plain text as a single unmarked segment", () => {
    expect(parseSnippet("no highlights here")).toEqual([
      { text: "no highlights here", marked: false },
    ]);
  });

  it("splits a single mark with surrounding text", () => {
    expect(parseSnippet("…before every <mark>deploy</mark>, run…")).toEqual([
      { text: "…before every ", marked: false },
      { text: "deploy", marked: true },
      { text: ", run…", marked: false },
    ]);
  });

  it("handles multiple marks", () => {
    expect(
      parseSnippet("<mark>deploy</mark> the <mark>service</mark>"),
    ).toEqual([
      { text: "deploy", marked: true },
      { text: " the ", marked: false },
      { text: "service", marked: true },
    ]);
  });

  it("handles marks at the start and end without empty segments", () => {
    expect(parseSnippet("<mark>start</mark> and <mark>end</mark>")).toEqual([
      { text: "start", marked: true },
      { text: " and ", marked: false },
      { text: "end", marked: true },
    ]);
  });

  it("handles adjacent marks", () => {
    expect(parseSnippet("<mark>a</mark><mark>b</mark>")).toEqual([
      { text: "a", marked: true },
      { text: "b", marked: true },
    ]);
  });

  it("returns no segments for an empty string", () => {
    expect(parseSnippet("")).toEqual([]);
  });

  it("keeps other markup as literal text (whitelist, not an HTML parser)", () => {
    expect(parseSnippet("<script>alert(1)</script>")).toEqual([
      { text: "<script>alert(1)</script>", marked: false },
    ]);
  });

  it("treats an unpaired <mark> token as literal text", () => {
    expect(parseSnippet("a literal <mark> token")).toEqual([
      { text: "a literal <mark> token", marked: false },
    ]);
  });

  it("highlights across newlines inside a mark", () => {
    expect(parseSnippet("x <mark>two\nlines</mark> y")).toEqual([
      { text: "x ", marked: false },
      { text: "two\nlines", marked: true },
      { text: " y", marked: false },
    ]);
  });
});
