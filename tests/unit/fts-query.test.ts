import { describe, expect, it } from "vitest";
import { toFtsQuery } from "@/lib/fts";

describe("toFtsQuery", () => {
  it("returns empty string for empty or whitespace input", () => {
    expect(toFtsQuery("")).toBe("");
    expect(toFtsQuery("   ")).toBe("");
    expect(toFtsQuery("\t\n")).toBe("");
  });

  it("strips quotes and special characters", () => {
    expect(toFtsQuery('foo"bar*')).toBe("foobar*");
    expect(toFtsQuery("hello'world")).toBe("helloworld*");
    expect(toFtsQuery("!!!")).toBe("");
    expect(toFtsQuery("@#$ %^&")).toBe("");
  });

  it("builds a single-token prefix query", () => {
    expect(toFtsQuery("onboarding")).toBe("onboarding*");
    expect(toFtsQuery("  Deploy  ")).toBe("deploy*");
  });

  it("joins multiple tokens with AND and adds * suffix", () => {
    expect(toFtsQuery("new hire")).toBe("new* AND hire*");
    expect(toFtsQuery("how we deploy")).toBe("how* AND we* AND deploy*");
  });

  it("keeps alphanumerics, underscore, and hyphen inside tokens", () => {
    expect(toFtsQuery("run-book_v2")).toBe("run-book_v2*");
  });
});
