import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("smoke", () => {
  it("slugify is importable and works", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
});
